/**
 * Anthropic API 클라이언트
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { UsageLimits } from '../types.js';
import { getCredentials } from './credentials.js';
import { API_TIMEOUT_MS, CACHE_DIR, CACHE_FILE } from '../constants.js';

interface CacheEntry {
  data: UsageLimits;
  timestamp: number;
}

// 메모리 캐시
let usageCache: CacheEntry | null = null;

/**
 * 캐시 파일 경로
 */
function getCachePath(): string {
  return path.join(os.homedir(), CACHE_DIR, CACHE_FILE);
}

/**
 * 메모리 캐시 유효성 확인
 */
function isCacheValid(ttlSeconds: number): boolean {
  if (!usageCache) return false;
  const ageSeconds = (Date.now() - usageCache.timestamp) / 1000;
  return ageSeconds < ttlSeconds;
}

/**
 * 파일 캐시 로드
 */
function loadFileCache(ttlSeconds: number): UsageLimits | null {
  try {
    const cachePath = getCachePath();
    if (!fs.existsSync(cachePath)) return null;

    const content = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    const ageSeconds = (Date.now() - content.timestamp) / 1000;

    if (ageSeconds < ttlSeconds) {
      return content.data as UsageLimits;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 파일 캐시 저장
 */
function saveFileCache(data: UsageLimits): void {
  try {
    const cachePath = getCachePath();
    const dir = path.dirname(cachePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    fs.writeFileSync(
      cachePath,
      JSON.stringify({ data, timestamp: Date.now() }),
      { mode: 0o600 }
    );
  } catch {
    // 캐시 저장 실패 무시
  }
}

/**
 * Rate Limit 정보 가져오기
 */
export async function fetchUsageLimits(ttlSeconds = 60): Promise<UsageLimits | null> {
  // 1. 메모리 캐시 확인
  if (isCacheValid(ttlSeconds) && usageCache) {
    return usageCache.data;
  }

  // 2. 파일 캐시 확인
  const fileCache = loadFileCache(ttlSeconds);
  if (fileCache) {
    usageCache = { data: fileCache, timestamp: Date.now() };
    return fileCache;
  }

  // 3. API 호출
  let token = await getCredentials();
  if (!token) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'gary-claude-code-hud/1.0.0',
        Authorization: `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
      signal: controller.signal,
    });

    // 보안: 토큰 메모리에서 제거
    token = null;

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();

    const limits: UsageLimits = {
      five_hour: data.five_hour,
      seven_day: data.seven_day,
      seven_day_sonnet: data.seven_day_sonnet,
    };

    // 캐시 저장
    usageCache = { data: limits, timestamp: Date.now() };
    saveFileCache(limits);

    return limits;
  } catch {
    // 보안: 오류 시에도 토큰 제거
    token = null;
    return null;
  }
}
