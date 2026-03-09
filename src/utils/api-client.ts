/**
 * Anthropic API 클라이언트
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { UsageLimits } from '../types.js';
import { getCredentials } from './credentials.js';
import { API_TIMEOUT_MS, CACHE_DIR, CACHE_FILE, RATE_LIMIT_BACKOFF_MS } from '../constants.js';

interface CacheEntry {
  data: UsageLimits;
  timestamp: number;
  retryAfter?: number;
}

interface FileCacheEntry extends CacheEntry {
  isStale: boolean;
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
 * usage API 디버그 로그 출력
 */
function logUsageDebug(message: string): void {
  if (process.env.CLAUDE_CODE_HUD_DEBUG === '1') {
    console.error(`[gary-claude-code-hud] ${message}`);
  }
}

/**
 * 파일 캐시 로드
 */
function loadFileCache(ttlSeconds: number): FileCacheEntry | null {
  try {
    const cachePath = getCachePath();
    if (!fs.existsSync(cachePath)) return null;

    const content = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    const ageSeconds = (Date.now() - content.timestamp) / 1000;
    return {
      data: content.data as UsageLimits,
      timestamp: content.timestamp as number,
      retryAfter: content.retryAfter as number | undefined,
      isStale: ageSeconds >= ttlSeconds,
    };
  } catch {
    return null;
  }
}

/**
 * 파일 캐시 저장
 */
function saveFileCache(data: UsageLimits, retryAfter?: number): void {
  try {
    const cachePath = getCachePath();
    const dir = path.dirname(cachePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const entry: Record<string, unknown> = { data, timestamp: Date.now() };
    if (retryAfter) entry.retryAfter = retryAfter;

    fs.writeFileSync(
      cachePath,
      JSON.stringify(entry),
      { mode: 0o600 }
    );
  } catch {
    // 캐시 저장 실패 무시
  }
}

/**
 * Retry-After 헤더 파싱 (초 단위 또는 HTTP-date)
 */
function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const ms = date.getTime() - Date.now();
    return ms > 0 ? ms : null;
  }

  return null;
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
  if (fileCache && !fileCache.isStale) {
    usageCache = { data: fileCache.data, timestamp: Date.now() };
    return fileCache.data;
  }

  // 2.5 retryAfter 백오프 체크 (429 방어)
  if (fileCache?.retryAfter && Date.now() < fileCache.retryAfter) {
    logUsageDebug(`rate limited, backing off until ${new Date(fileCache.retryAfter).toISOString()}`);
    return fileCache.data;
  }

  // 3. API 호출
  let token = await getCredentials();
  if (!token) {
    if (fileCache) {
      logUsageDebug('credentials unavailable, falling back to stale cache');
      usageCache = { data: fileCache.data, timestamp: fileCache.timestamp };
      return fileCache.data;
    }
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
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
    if (!response.ok) {
      logUsageDebug(`usage API returned HTTP ${response.status}`);

      if (response.status === 429 && fileCache) {
        const retryAfterHeader = response.headers.get('retry-after');
        const backoffMs = parseRetryAfter(retryAfterHeader) ?? RATE_LIMIT_BACKOFF_MS;
        logUsageDebug(`429 rate limited, backing off for ${backoffMs / 1000}s`);
        saveFileCache(fileCache.data, Date.now() + backoffMs);
        return fileCache.data;
      }

      if (fileCache) {
        saveFileCache(fileCache.data);
        return fileCache.data;
      }
      return null;
    }

    const data = await response.json();
    if (typeof data !== 'object' || data === null) {
      logUsageDebug('usage API returned a non-object payload');
      if (fileCache) {
        saveFileCache(fileCache.data);
        return fileCache.data;
      }
      return null;
    }

    const limits: UsageLimits = {
      five_hour: data.five_hour,
      seven_day: data.seven_day,
      seven_day_sonnet: data.seven_day_sonnet,
    };

    // 캐시 저장
    usageCache = { data: limits, timestamp: Date.now() };
    saveFileCache(limits);

    return limits;
  } catch (error) {
    // 보안: 오류 시에도 토큰 제거
    token = null;
    logUsageDebug(
      error instanceof Error ? `usage API request failed: ${error.message}` : 'usage API request failed'
    );
    if (fileCache) {
      saveFileCache(fileCache.data);
      return fileCache.data;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
