#!/usr/bin/env node

/**
 * gary-claude-code-hud
 * Claude Code용 실시간 상태 HUD
 */

import type { ExternalUsage, RenderContext } from './types.js';
import { readStdin } from './utils/stdin.js';
import { loadConfig } from './utils/config.js';
import { parseTranscript } from './utils/transcript.js';
import { countConfigs } from './utils/config-counter.js';
import { getGitStatus } from './utils/git.js';
import { fetchUsageLimits } from './utils/api-client.js';
import { readCodexUsage } from './utils/codex-usage.js';
import { readGrokUsage } from './utils/grok-usage.js';
import { render } from './render/index.js';
import { yellow, RESET } from './utils/colors.js';
import { ICON } from './constants.js';

/**
 * 메인 함수
 */
async function main(): Promise<void> {
  try {
    // 1. 설정 로드
    const config = await loadConfig();

    // 2. stdin에서 Claude Code 데이터 읽기
    const stdin = await readStdin();
    if (!stdin) {
      console.log(`${yellow(ICON.warning)} ${RESET}`);
      return;
    }

    // 3. 트랜스크립트 파싱
    const transcriptPath = stdin.transcript_path ?? '';
    const transcript = await parseTranscript(transcriptPath);

    // 4. 설정 파일 카운트
    const configCounts = await countConfigs(stdin.cwd);

    // 5. Git 상태
    const gitStatus = config.display.showGit ? await getGitStatus(stdin.cwd) : null;

    // 6. Rate Limit
    const rateLimits = config.display.showRateLimit
      ? await fetchUsageLimits(config.cache.ttlSeconds)
      : null;

    // 7. 외부 CLI 사용량 (로컬 파일만 읽는다 — 네트워크 호출 없음)
    let externalUsage: ExternalUsage | null = null;
    if (config.display.showExternalUsage) {
      try {
        externalUsage = {
          codex: readCodexUsage(),
          grok: readGrokUsage(stdin.cwd, config.grokWeekAnchor),
        };
      } catch {
        // 외부 CLI 미설치·경로 변경으로 실패해도 HUD 전체는 살린다
        externalUsage = null;
      }
    }

    // 8. 렌더 컨텍스트 구성
    const ctx: RenderContext = {
      stdin,
      config,
      transcript,
      configCounts,
      gitBranch: gitStatus?.branch,
      gitDirty: gitStatus?.isDirty,
      rateLimits,
      externalUsage,
    };

    // 9. 렌더링
    render(ctx);
  } catch (error) {
    console.log(`${yellow(ICON.warning)} ${RESET}`);
  }
}

// 실행
main().catch(() => {
  console.log(`${yellow(ICON.warning)} ${RESET}`);
});
