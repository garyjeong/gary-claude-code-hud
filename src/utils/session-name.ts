/**
 * 세션 이름 조회
 *
 * Claude Code는 실행 중인 세션마다 ~/.claude/sessions/<pid>.json 에
 * sessionId·name·status를 기록한다. 상태줄 stdin은 이름을 주지 않으므로
 * 세션 UUID로 그 파일을 역조회한다.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { StdinInput } from '../types.js';

const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'sessions');

/**
 * 세션 UUID 얻기.
 * stdin에 session_id가 있으면 그것을, 없으면 트랜스크립트 파일명에서 뽑는다
 * (transcript_path는 …/<sessionId>.jsonl 형태다).
 */
export function getSessionId(stdin: StdinInput): string | null {
  if (stdin.session_id) return stdin.session_id;

  const transcriptPath = stdin.transcript_path;
  if (!transcriptPath) return null;

  const base = path.basename(transcriptPath, '.jsonl');
  return base || null;
}

/**
 * 세션 이름 조회.
 *
 * 이름은 런타임에 바뀔 수 있어 캐시하지 않고 매번 읽는다.
 * 살아있는 세션 수만큼(보통 수십 개 미만·각 1KB 미만) 읽으므로 비용이 없다.
 */
export function getSessionName(sessionId: string | null): string | null {
  if (!sessionId) return null;

  let files: string[];
  try {
    files = fs.readdirSync(SESSIONS_DIR);
  } catch {
    // 디렉터리 없음(구버전·다른 배포) — 이름 없이 진행
    return null;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8');
      const data = JSON.parse(raw) as { sessionId?: string; name?: string };
      if (data.sessionId === sessionId && data.name) return data.name;
    } catch {
      // 기록 중이라 깨져 보이는 파일 — 이 파일만 건너뛴다
    }
  }

  return null;
}
