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
      isStale: ageSeconds >= ttlSeconds,
    };
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
  if (fileCache && !fileCache.isStale) {
    usageCache = { data: fileCache.data, timestamp: Date.now() };
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
      if (fileCache) {
        usageCache = { data: fileCache.data, timestamp: fileCache.timestamp };
        return fileCache.data;
      }
      return null;
    }

    const data = await response.json();
    if (typeof data !== 'object' || data === null) {
      logUsageDebug('usage API returned a non-object payload');
      if (fileCache) {
        usageCache = { data: fileCache.data, timestamp: fileCache.timestamp };
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
      usageCache = { data: fileCache.data, timestamp: fileCache.timestamp };
      return fileCache.data;
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
