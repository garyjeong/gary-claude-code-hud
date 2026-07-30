/**
 * 외부 CLI 사용량 집계 캐시
 *
 * codex·grok을 계정 전역·주간 창으로 집계하려면 세션 파일 수백 개를 훑어야 한다
 * (실측: codex 창 안 102개, grok 전역 91개 세션). 상태줄은 매 갱신마다 실행되므로
 * 그 비용을 그대로 물면 안 된다. 결과를 짧은 TTL로 캐시해 스캔을 분당 1회 수준으로 줄인다.
 *
 * 실패는 조용히 넘긴다 — 캐시가 없거나 깨져도 스캔으로 폴백하면 되고,
 * 상태줄이 깨지는 것보다 낫다.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { CACHE_DIR, EXTERNAL_CACHE_FILE } from '../constants.js';

interface Envelope<T> {
  data: T;
  timestamp: number;
  /** 캐시를 무효화해야 하는 입력 조건(창 경계 등) */
  key: string;
}

function cachePath(): string {
  return path.join(os.homedir(), CACHE_DIR, EXTERNAL_CACHE_FILE);
}

export function loadExternalCache<T>(key: string, ttlSeconds: number): T | null {
  try {
    const p = cachePath();
    if (!fs.existsSync(p)) return null;
    const env = JSON.parse(fs.readFileSync(p, 'utf-8')) as Envelope<T>;
    if (env.key !== key) return null;
    if ((Date.now() - env.timestamp) / 1000 >= ttlSeconds) return null;
    return env.data;
  } catch {
    return null;
  }
}

export function saveExternalCache<T>(key: string, data: T): void {
  try {
    const p = cachePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const env: Envelope<T> = { data, timestamp: Date.now(), key };
    fs.writeFileSync(p, JSON.stringify(env), { mode: 0o600 });
  } catch {
    // 캐시 저장 실패 무시
  }
}
