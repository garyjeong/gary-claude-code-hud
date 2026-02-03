#!/usr/bin/env node

/**
 * gary-claude-code-hud
 * Claude Code용 실시간 상태 HUD
 */

import type { RenderContext } from './types.js';
import { readStdin } from './utils/stdin.js';
import { loadConfig } from './utils/config.js';
import { parseTranscript } from './utils/transcript.js';
import { countConfigs } from './utils/config-counter.js';
import { getGitStatus } from './utils/git.js';
import { fetchUsageLimits } from './utils/api-client.js';
import { formatSessionDuration } from './utils/formatters.js';
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

    // 7. 세션 시간
    const sessionDuration = formatSessionDuration(transcript.sessionStart);

    // 8. 렌더 컨텍스트 구성
    const ctx: RenderContext = {
      stdin,
      config,
      transcript,
      configCounts,
      gitBranch: gitStatus?.branch,
      gitDirty: gitStatus?.isDirty,
      sessionDuration,
      rateLimits,
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
