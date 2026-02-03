/**
 * OAuth 인증 정보 읽기
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';

interface CredentialsFile {
  claudeAiOauth?: {
    accessToken?: string;
    refreshToken?: string;
    subscriptionType?: string;
    expiresAt?: number;
  };
}

const KEYCHAIN_TIMEOUT_MS = 5000;

/**
 * OAuth 토큰 가져오기
 * macOS Keychain → 파일 순으로 시도
 */
export async function getCredentials(): Promise<string | null> {
  const homeDir = os.homedir();
  const now = Date.now();

  // 1. macOS Keychain 시도
  const keychainCreds = readKeychainCredentials(now);
  if (keychainCreds?.accessToken) {
    return keychainCreds.accessToken;
  }

  // 2. 파일 기반 credentials 시도
  const fileCreds = readFileCredentials(homeDir, now);
  if (fileCreds?.accessToken) {
    return fileCreds.accessToken;
  }

  return null;
}

/**
 * macOS Keychain에서 credentials 읽기
 */
function readKeychainCredentials(now: number): { accessToken: string; subscriptionType: string } | null {
  if (process.platform !== 'darwin') {
    return null;
  }

  try {
    const keychainData = execFileSync(
      '/usr/bin/security',
      ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
      {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: KEYCHAIN_TIMEOUT_MS,
      }
    ).trim();

    if (!keychainData) {
      return null;
    }

    const data: CredentialsFile = JSON.parse(keychainData);
    return parseCredentialsData(data, now);
  } catch {
    return null;
  }
}

/**
 * 파일에서 credentials 읽기
 */
function readFileCredentials(
  homeDir: string,
  now: number
): { accessToken: string; subscriptionType: string } | null {
  const credentialsPath = path.join(homeDir, '.claude', '.credentials.json');

  if (!fs.existsSync(credentialsPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(credentialsPath, 'utf8');
    const data: CredentialsFile = JSON.parse(content);
    return parseCredentialsData(data, now);
  } catch {
    return null;
  }
}

/**
 * credentials 데이터 파싱 및 검증
 */
function parseCredentialsData(
  data: CredentialsFile,
  now: number
): { accessToken: string; subscriptionType: string } | null {
  const accessToken = data.claudeAiOauth?.accessToken;
  const subscriptionType = data.claudeAiOauth?.subscriptionType ?? '';

  if (!accessToken) {
    return null;
  }

  // 토큰 만료 확인
  const expiresAt = data.claudeAiOauth?.expiresAt;
  if (expiresAt != null && expiresAt <= now) {
    return null;
  }

  return { accessToken, subscriptionType };
}
