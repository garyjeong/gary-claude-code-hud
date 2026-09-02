#!/usr/bin/env node

/**
 * gary-claude-code-hud
 * Claude Code용 실시간 상태 HUD
 */

import type { ExternalUsage, RenderContext } from './types.js';
import { readStdin } from './utils/stdin.js';
import { loadConfig } from './utils/config.js';
import { parseTranscript } from './utils/transcript.js';
import { getSessionId, getSessionName } from './utils/session-name.js';
import { countConfigs } from './utils/config-counter.js';
import { getGitStatus } from './utils/git.js';
import { fetchUsageLimits } from './utils/api-client.js';
import { hasCodexData, readCodexUsage } from './utils/codex-usage.js';
import { hasGrokData, readGrokUsage } from './utils/grok-usage.js';
import { loadExternalCache, saveExternalCache } from './utils/external-cache.js';
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
    //
    // 계정 전역·주간 집계라 세션 파일 수백 개를 훑는다. 상태줄은 매 갱신마다
    // 실행되므로 결과를 캐시해 스캔을 TTL당 한 번으로 줄인다.
    // 두 리더는 각각 try로 감싼다 — 한쪽이 던져도 다른 쪽 성공분은 살린다.
    let externalUsage: ExternalUsage | null = null;
    if (config.display.showExternalUsage) {
      const cacheKey = `ext:${config.grokWeekAnchor}`;
      externalUsage = loadExternalCache<ExternalUsage>(cacheKey, config.cache.ttlSeconds);

      if (!externalUsage) {
        let codex: ExternalUsage['codex'] = null;
        let grok: ExternalUsage['grok'] = null;
        try {
          codex = readCodexUsage();
        } catch {
          // codex 미설치·경로 변경 — 이 항목만 생략
        }
        try {
          grok = readGrokUsage(config.grokWeekAnchor);
        } catch {
          // grok 미설치·경로 변경 — 이 항목만 생략
        }
        externalUsage = { codex, grok };
        // 데이터가 있는데도 못 읽은 경우만 "일시적 실패"로 보고 짧은 TTL을 쓴다.
        // 애초에 안 쓰는 CLI까지 실패로 취급하면, 그 사용자는 매번 전체 스캔을 문다.
        const partial = (!codex && hasCodexData()) || (!grok && hasGrokData());
        saveExternalCache(cacheKey, externalUsage, partial);
      }
    }

    // 8. 세션 이름 (~/.claude/sessions 역조회 — 없으면 표시 생략)
    const sessionName = getSessionName(getSessionId(stdin)) ?? undefined;

    // 9. 렌더 컨텍스트 구성
    const ctx: RenderContext = {
      stdin,
      sessionName,
      config,
      transcript,
      configCounts,
      gitBranch: gitStatus?.branch,
      gitDirty: gitStatus?.isDirty,
      rateLimits,
      externalUsage,
    };

    // 10. 렌더링
    render(ctx);
  } catch (error) {
    console.log(`${yellow(ICON.warning)} ${RESET}`);
  }
}

// 실행
main().catch(() => {
  console.log(`${yellow(ICON.warning)} ${RESET}`);
});
