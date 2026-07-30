/**
 * grok CLI 사용량 리더
 *
 * grok은 한도(quota) 정보를 노출하지 않는다 — 세션 파일과 headless JSON 출력 어디에도
 * rate limit / 잔여량 필드가 없다. 따라서 "몇 % 남았나"는 표시할 수 없고,
 * 토큰·비용·호출 수만 집계한다.
 *
 *   ~/.grok/sessions/<URL인코딩된 cwd>/<session-uuid>/updates.jsonl
 *
 * updates.jsonl의 각 usage 항목은 그 세션의 *누적* 값이다. 따라서 세션별 마지막
 * 항목만 모아 더하면 프로젝트 단위 합계가 된다.
 *
 * 집계 창은 grok.com이 쓰는 주간 한도 창과 맞춘다. 한도 %는 못 가져오지만,
 * 같은 창의 누적을 보여주면 웹 화면의 값과 나란히 비교할 수 있다.
 * 창 계산은 초기화 시각(설정 grokWeekAnchor)을 앵커로 7일 주기로 되돌려 잡는다.
 *
 * 비용: costUsdTicks / 1e10 = USD. 실측 확인 —
 *   total_cost_usd_ticks 362740000 ↔ total_cost_usd 0.036274
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

/**
 * 꼬리 읽기 크기 단계. 창 직전 기준선을 못 찾으면 키워가며 다시 읽는다.
 * 대부분의 세션은 첫 단계에서 끝나고, 경계를 걸친 긴 세션만 더 읽는다.
 */
const TAIL_STEPS = [64 * 1024, 512 * 1024, 4 * 1024 * 1024];
/** 세션 시작 시각 판정용. 첫 줄만 필요해 아주 작게 읽는다. */
const HEAD_BYTES = 8 * 1024;
/** 스캔할 최대 세션 수. 주간 창이라 세션이 많아도 상태줄 렌더가 느려지지 않게 제한한다. */
const MAX_SESSIONS = 40;
/** 실측으로 확정한 환산 비율 */
const TICKS_PER_USD = 1e10;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface GrokUsage {
  totalTokens: number;
  costUsd: number;
  modelCalls: number;
  /** 집계에 포함된 세션 수 */
  sessions: number;
  /** 이 창이 초기화되는 시각 (epoch 초) */
  resetsAt: number;
  /** 상한에 걸려 일부 세션이 빠졌는지 */
  truncated: boolean;
}

/**
 * 앵커를 기준으로 현재 주간 창을 구한다.
 * 앵커가 미래여도 과거여도 동작한다 — 7일 주기로 now를 포함하는 창을 찾는다.
 */
export function weeklyWindow(anchorIso: string, now = new Date()): { start: Date; reset: Date } | null {
  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) return null;

  const k = Math.ceil((now.getTime() - anchor.getTime()) / WEEK_MS);
  let reset = new Date(anchor.getTime() + k * WEEK_MS);
  // 경계에서 now와 정확히 같으면 다음 창으로 넘긴다.
  if (reset.getTime() <= now.getTime()) reset = new Date(reset.getTime() + WEEK_MS);

  return { start: new Date(reset.getTime() - WEEK_MS), reset };
}

interface RawUsage {
  totalTokens?: number;
  costUsdTicks?: number;
  modelCalls?: number;
}

/** 꼬리를 읽고, 파일 처음부터 읽었는지(complete) 함께 알려준다. */
function readTail(file: string, maxBytes: number): { text: string; complete: boolean } {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const len = size - start;
    const buf = Buffer.allocUnsafe(len);
    fs.readSync(fd, buf, 0, len, start);
    return { text: buf.toString('utf-8'), complete: start === 0 };
  } finally {
    fs.closeSync(fd);
  }
}

function deepFindUsage(obj: unknown): RawUsage | null {
  if (obj === null || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const r = deepFindUsage(v);
      if (r) return r;
    }
    return null;
  }
  const rec = obj as Record<string, unknown>;
  const u = rec.usage;
  // modelUsage 안에도 같은 모양의 객체가 있어 totalTokens 존재로 판별한다.
  if (u && typeof u === 'object' && typeof (u as RawUsage).totalTokens === 'number') {
    return u as RawUsage;
  }
  for (const v of Object.values(rec)) {
    const r = deepFindUsage(v);
    if (r) return r;
  }
  return null;
}

interface UsageAt {
  ts: number;
  u: RawUsage;
}

/** 텍스트에서 (타임스탬프, 누적 usage) 쌍을 시간순으로 뽑는다. */
function usageEntries(text: string): UsageAt[] {
  const out: UsageAt[] = [];
  for (const line of text.split('\n')) {
    if (!line || !line.includes('"usage"')) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue; // 꼬리 절단으로 깨진 줄
    }
    const u = deepFindUsage(parsed);
    if (!u) continue;
    const ts = (parsed as { timestamp?: unknown }).timestamp;
    if (typeof ts !== 'number') continue;
    out.push({ ts, u });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

function subtract(end: RawUsage, base?: RawUsage): RawUsage {
  const d = (a?: number, b?: number) => Math.max(0, (a ?? 0) - (b ?? 0));
  return {
    totalTokens: d(end.totalTokens, base?.totalTokens),
    costUsdTicks: d(end.costUsdTicks, base?.costUsdTicks),
    modelCalls: d(end.modelCalls, base?.modelCalls),
  };
}

/** 파일 앞부분만 읽어 세션이 시작된 시각(첫 줄 timestamp)을 구한다. */
function firstTimestamp(file: string): number | null {
  let fd: number;
  try {
    fd = fs.openSync(file, 'r');
  } catch {
    return null;
  }
  try {
    const buf = Buffer.allocUnsafe(HEAD_BYTES);
    const n = fs.readSync(fd, buf, 0, HEAD_BYTES, 0);
    for (const line of buf.subarray(0, n).toString('utf-8').split('\n')) {
      if (!line) continue;
      try {
        const ts = (JSON.parse(line) as { timestamp?: unknown }).timestamp;
        if (typeof ts === 'number') return ts;
      } catch {
        break; // 앞부분이 잘린 게 아니라 형식이 다른 것 — 판정 불가
      }
    }
  } catch {
    // 무시
  } finally {
    fs.closeSync(fd);
  }
  return null;
}

/**
 * 한 세션이 이 창에서 실제로 늘린 양(증분).
 *
 * `usage`는 세션 전체 누적이다. 창 안의 마지막 값을 그대로 더하면, 창 시작 전에
 * 열려 창 안에서 갱신된 세션의 **이전 주 사용량까지** 합산된다. 창 직전 값을
 * 기준선으로 빼야 맞다.
 *
 * 기준선을 꼬리에서만 찾으려 하면, 큰 파일에서 경계까지 닿지 못해 창 안 첫 항목을
 * 기준선으로 쓰게 되고 그 세션의 첫 몫이 사라진다(실측: 1.3M 과소). 세션이 창 안에서
 * 시작했는지는 **파일 앞부분 몇 KB만 읽으면** 확정되므로, 그걸로 먼저 판정한다.
 */
function sessionDelta(dir: string, winStart: number, winEnd: number): RawUsage | null {
  const file = path.join(dir, 'updates.jsonl');

  // 1) 꼬리에서 창 안 마지막 누적값을 얻는다.
  let read: { text: string; complete: boolean };
  try {
    read = readTail(file, TAIL_STEPS[0]);
  } catch {
    return null;
  }
  const entries = usageEntries(read.text);
  const inWindow = entries.filter((e) => e.ts >= winStart && e.ts < winEnd);
  if (inWindow.length === 0) return null;
  const end = inWindow[inWindow.length - 1].u;

  // 2) 세션이 창 안에서 시작했으면 기준선은 0이다(앞부분 몇 KB로 확정).
  const started = firstTimestamp(file);
  if (started !== null && started >= winStart) return subtract(end);

  // 3) 창 전에 시작한 세션 — 창 직전 마지막 누적을 찾을 때까지 꼬리를 키운다.
  let cur = read;
  let curEntries = entries;
  for (let i = 0; i < TAIL_STEPS.length; i++) {
    if (i > 0) {
      try {
        cur = readTail(file, TAIL_STEPS[i]);
      } catch {
        break;
      }
      curEntries = usageEntries(cur.text);
    }
    const before = curEntries.filter((e) => e.ts < winStart).pop();
    if (before) return subtract(end, before.u);
    // 처음부터 다 읽었는데 창 전 usage가 없다 → 기준선 0.
    if (cur.complete) return subtract(end);
  }

  // 여기까지 오면 창 전에 시작한 아주 큰 파일이다. 창 안 첫 항목을 기준선으로 삼아
  // 이전 주가 섞이는 것만은 막는다(이 경우에만 과소 집계될 수 있다).
  return subtract(end, inWindow[0].u);
}

/**
 * 이 프로젝트(cwd)의 이번 주간 창 grok 사용량 합계. 실패하면 null.
 */
export function readGrokUsage(cwd?: string, weekAnchor?: string): GrokUsage | null {
  if (!cwd) return null;

  const win = weekAnchor ? weeklyWindow(weekAnchor) : null;
  if (!win) return null;

  // grok은 cwd를 URL 인코딩해 디렉터리명으로 쓴다 ('/' 까지 인코딩).
  const encoded = encodeURIComponent(cwd);
  const base = path.join(os.homedir(), '.grok', 'sessions', encoded);

  let inWindow: { dir: string; mtime: number }[];
  try {
    inWindow = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => {
        const full = path.join(base, e.name);
        try {
          return { dir: full, mtime: fs.statSync(path.join(full, 'updates.jsonl')).mtimeMs };
        } catch {
          return { dir: full, mtime: 0 };
        }
      })
      .filter((x) => x.mtime >= win.start.getTime() && x.mtime < win.reset.getTime())
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return null;
  }

  if (inWindow.length === 0) return null;

  const truncated = inWindow.length > MAX_SESSIONS;
  const dirs = inWindow.slice(0, MAX_SESSIONS);

  let totalTokens = 0;
  let ticks = 0;
  let modelCalls = 0;
  let sessions = 0;

  const winStart = Math.floor(win.start.getTime() / 1000);
  const winEnd = Math.floor(win.reset.getTime() / 1000);

  for (const { dir } of dirs) {
    const u = sessionDelta(dir, winStart, winEnd);
    if (!u) continue;
    totalTokens += u.totalTokens ?? 0;
    ticks += u.costUsdTicks ?? 0;
    modelCalls += u.modelCalls ?? 0;
    sessions++;
  }

  if (sessions === 0) return null;

  return {
    totalTokens,
    costUsd: ticks / TICKS_PER_USD,
    modelCalls,
    sessions,
    resetsAt: Math.floor(win.reset.getTime() / 1000),
    truncated,
  };
}
