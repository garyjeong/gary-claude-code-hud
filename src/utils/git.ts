/**
 * Git 상태 유틸리티
 */

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { isAbsolute, normalize } from 'node:path';

const GIT_TIMEOUT_MS = 3000;

interface GitStatus {
  branch: string;
  isDirty: boolean;
}

/**
 * 경로 유효성 검사
 */
function isValidPath(p: string): boolean {
  if (!p || typeof p !== 'string') return false;
  if (!isAbsolute(p)) return false;
  // 경로 탐색 공격 방지
  const normalized = normalize(p);
  return normalized === p || normalized === p + '/';
}

/**
 * Git 상태 가져오기
 */
export async function getGitStatus(cwd?: string): Promise<GitStatus | null> {
  if (!cwd || !isValidPath(cwd)) {
    return null;
  }

  try {
    // Git 브랜치 가져오기
    const branch = execFileSync(
      '/usr/bin/git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      {
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: GIT_TIMEOUT_MS,
      }
    ).trim();

    // dirty 상태 확인
    let isDirty = false;
    try {
      const status = execFileSync(
        '/usr/bin/git',
        ['status', '--porcelain', '--untracked-files=no'],
        {
          cwd,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: GIT_TIMEOUT_MS,
        }
      ).trim();
      isDirty = status.length > 0;
    } catch {
      // dirty 상태 확인 실패 시 false 유지
    }

    return { branch, isDirty };
  } catch {
    return null;
  }
}

/**
 * Git 브랜치만 가져오기 (빠른 버전)
 */
export async function getGitBranch(cwd?: string): Promise<string | undefined> {
  const status = await getGitStatus(cwd);
  return status?.branch;
}

/**
 * 프로젝트 경로에서 디렉토리명 추출
 */
export function getProjectName(cwd?: string, levels = 1): string {
  if (!cwd) return '';

  const segments = cwd.split(path.sep).filter(Boolean);
  if (segments.length === 0) return '/';

  return segments.slice(-levels).join('/');
}
