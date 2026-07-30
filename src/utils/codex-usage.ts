/**
 * codex CLI 사용량 리더
 *
 * codex는 사용량을 조회하는 서브커맨드를 제공하지 않는다. 대신 세션 rollout 파일에
 * 서버가 내려준 rate_limits 스냅샷이 턴마다 기록된다. 가장 최근 파일의 마지막
 * 스냅샷이 곧 현재 한도 상태다.
 *
 *   ~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl
 *
 * 파일이 수백 개(전체 216개)라 전부 훑으면 상태줄 렌더가 느려진다. 그래서 오늘
 * 디렉터리만 보고, 그중 가장 최근 파일의 꼬리 일부만 읽는다.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/** 파일 꼬리에서 읽을 최대 바이트. rate_limits는 턴마다 기록되므로 이 정도면 충분하다. */
const TAIL_BYTES = 256 * 1024;

/**
 * 스냅샷을 찾을 때까지 훑을 최대 파일 수.
 *
 * 최신 파일 하나만 보면 안 된다 — 짧은 `codex exec` 실행은 rate_limits 스냅샷을
 * 한 번도 받지 못한 채 끝나는 경우가 있고(실측: 153KB 파일에 0줄), 그러면 표시가
 * 통째로 사라진다. rate_limits는 세션이 아니라 계정 상태이므로 조금 이전 파일에서
 * 가져와도 유효하다 — mtime 내림차순으로 훑어 가장 최신 스냅샷을 집는다.
 */
const MAX_FILES_SCANNED = 10;

/** 주간 집계에서 훑을 최대 rollout 파일 수 (실측: 창 안 102개) */
const MAX_WINDOW_FILES = 200;

export interface CodexUsage {
  /** 한도 소진율 (%) */
  usedPercent: number;
  /** 한도 윈도우 (분). 10080 = 7일 */
  windowMinutes: number;
  /** 한도 초기화 시각 (epoch 초) */
  resetsAt: number;
  /** 플랜 (예: plus) */
  planType?: string;
  /** 한도 창 안에서 계정 전체가 쓴 토큰 (grok과 같은 범위·같은 창) */
  windowTokens?: number;
  /** 상한이나 경계 걸친 세션 때문에 일부가 빠졌는지 */
  truncated?: boolean;
}

function sessionsRoot(): string {
  return path.join(os.homedir(), '.codex', 'sessions');
}

/** YYYY/MM/DD 경로 조각 */
function datePath(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return path.join(String(y), m, day);
}

/**
 * 최근 rollout 파일 경로들을 최신순으로. 오늘 + 어제 디렉터리를 함께 본다.
 * (자정 직후에는 오늘 디렉터리가 비어 있거나 파일이 적다)
 */
function listRecentRollouts(limit: number): string[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);

  const found: { file: string; mtime: number }[] = [];
  for (const d of [now, yesterday]) {
    const dir = path.join(sessionsRoot(), datePath(d));
    let entries: string[];
    try {
      entries = fs.readdirSync(dir).filter((f) => f.startsWith('rollout-') && f.endsWith('.jsonl'));
    } catch {
      continue;
    }
    for (const f of entries) {
      const full = path.join(dir, f);
      try {
        found.push({ file: full, mtime: fs.statSync(full).mtimeMs });
      } catch {
        // 접근 불가 파일 무시
      }
    }
    // 오늘 것만으로 충분하면 어제까지 뒤지지 않는다.
    if (found.length >= limit) break;
  }

  return found
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit)
    .map((x) => x.file);
}

/** 파일 꼬리를 읽는다. 첫 줄은 중간에서 잘릴 수 있으므로 호출자가 파싱 실패를 넘겨야 한다. */
function readTail(file: string, maxBytes: number): string {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const len = size - start;
    const buf = Buffer.allocUnsafe(len);
    fs.readSync(fd, buf, 0, len, start);
    return buf.toString('utf-8');
  } finally {
    fs.closeSync(fd);
  }
}

/** 중첩 객체에서 키를 깊이 탐색한다. rate_limits의 위치가 이벤트 종류에 따라 다르다. */
function deepFind(obj: unknown, key: string): unknown {
  if (obj === null || typeof obj !== 'object') return undefined;
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = deepFind(v, key);
      if (r !== undefined) return r;
    }
    return undefined;
  }
  const rec = obj as Record<string, unknown>;
  if (rec[key] !== undefined && rec[key] !== null) return rec[key];
  for (const v of Object.values(rec)) {
    const r = deepFind(v, key);
    if (r !== undefined) return r;
  }
  return undefined;
}

interface ParsedRollout {
  limits: Record<string, unknown> | null;
  totalTokens?: number;
}

/** 한 rollout 파일 꼬리에서 최신 rate_limits / total_token_usage를 뽑는다. */
function parseRollout(file: string): ParsedRollout {
  let text: string;
  try {
    text = readTail(file, TAIL_BYTES);
  } catch {
    return { limits: null };
  }

  const lines = text.split('\n');
  let limits: Record<string, unknown> | null = null;
  let totalTokens: number | undefined;

  // 뒤에서부터 훑어 가장 최신 스냅샷을 먼저 만난다.
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line) continue;
    const hasLimits = !limits && line.includes('"rate_limits"');
    const hasTokens = totalTokens === undefined && line.includes('"total_token_usage"');
    if (!hasLimits && !hasTokens) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue; // 꼬리 절단으로 깨진 줄
    }

    if (hasLimits) {
      const found = deepFind(parsed, 'rate_limits');
      if (found && typeof found === 'object') limits = found as Record<string, unknown>;
    }
    if (hasTokens) {
      const usage = deepFind(parsed, 'total_token_usage');
      if (usage && typeof usage === 'object') {
        const t = (usage as Record<string, unknown>).total_tokens;
        if (typeof t === 'number') totalTokens = t;
      }
    }
    if (limits && totalTokens !== undefined) break;
  }

  return { limits, totalTokens };
}

/**
 * rollout 파일명에서 세션 시작 시각을 뽑는다.
 * 예: rollout-2026-07-30T14-22-01-<uuid>.jsonl → 2026-07-30 14:22:01 (로컬)
 */
function sessionStartFromName(file: string): number | null {
  const m = path.basename(file).match(/^rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const t = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)).getTime();
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

/** 창 구간을 덮는 날짜 디렉터리들의 rollout 파일 전체 */
function rolloutsInRange(startSec: number, endSec: number): string[] {
  const out: string[] = [];
  const oneDay = 86_400_000;
  // 경계 세션을 놓치지 않게 시작일 하루 전부터 훑는다.
  for (let t = (startSec - 86_400) * 1000; t <= endSec * 1000 + oneDay; t += oneDay) {
    const dir = path.join(sessionsRoot(), datePath(new Date(t)));
    let entries: string[];
    try {
      entries = fs.readdirSync(dir).filter((f) => f.startsWith('rollout-') && f.endsWith('.jsonl'));
    } catch {
      continue;
    }
    for (const f of entries) out.push(path.join(dir, f));
  }
  return out;
}

/**
 * 한도 창 안에서 계정 전체가 쓴 토큰.
 *
 * rollout 파일 하나가 세션 하나이고 total_token_usage는 그 세션의 누적이므로,
 * 창 안에서 **시작한** 세션들의 마지막 값을 더하면 창 누적이 된다.
 * 창 시작 전에 시작한 세션은 이전 창 몫이 섞이므로 제외하고 truncated로 표시한다
 * (codex 세션은 짧아 경계에 걸리는 경우가 드물다).
 */
function windowTokenTotal(startSec: number, endSec: number): { tokens: number; truncated: boolean } {
  const files = rolloutsInRange(startSec, endSec);
  let truncated = files.length > MAX_WINDOW_FILES;

  let tokens = 0;
  for (const file of files.slice(0, MAX_WINDOW_FILES)) {
    const started = sessionStartFromName(file);
    if (started === null) continue;
    if (started >= endSec) continue;
    if (started < startSec) {
      // 경계를 걸친 세션 — 이 파일이 창 안에서도 갱신됐다면 몫이 빠진다.
      try {
        if (fs.statSync(file).mtimeMs / 1000 >= startSec) truncated = true;
      } catch {
        // 무시
      }
      continue;
    }
    const { totalTokens } = parseRollout(file);
    if (typeof totalTokens === 'number') tokens += totalTokens;
  }
  return { tokens, truncated };
}

/**
 * codex 사용량 읽기. 실패하면 null — HUD는 해당 항목을 생략한다.
 *
 * 스냅샷이 있는 파일을 만날 때까지 최신순으로 훑는다(최신 파일 하나만 보면
 * 스냅샷 없는 짧은 실행 때문에 표시가 사라진다).
 */
export function readCodexUsage(): CodexUsage | null {
  const files = listRecentRollouts(MAX_FILES_SCANNED);

  for (const file of files) {
    const { limits } = parseRollout(file);
    if (!limits) continue;

    // primary가 주 한도다. secondary는 이 플랜에서 null로 내려온다.
    const primary = limits.primary as Record<string, unknown> | null | undefined;
    if (!primary || typeof primary.used_percent !== 'number') continue;

    const windowMinutes = typeof primary.window_minutes === 'number' ? primary.window_minutes : 0;
    const resetsAt = typeof primary.resets_at === 'number' ? primary.resets_at : 0;

    // 토큰은 한도와 같은 창·같은 범위(계정 전역)로 집계한다. 창은 서버가 준
    // window_minutes / resets_at 로 정확히 정해지므로 별도 설정이 필요 없다.
    let windowTokens: number | undefined;
    let truncated: boolean | undefined;
    if (windowMinutes > 0 && resetsAt > 0) {
      const startSec = resetsAt - windowMinutes * 60;
      const agg = windowTokenTotal(startSec, resetsAt);
      windowTokens = agg.tokens;
      truncated = agg.truncated;
    }

    return {
      usedPercent: primary.used_percent,
      windowMinutes,
      resetsAt,
      planType: typeof limits.plan_type === 'string' ? limits.plan_type : undefined,
      windowTokens,
      truncated,
    };
  }

  return null;
}
