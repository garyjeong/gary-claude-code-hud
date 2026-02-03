/**
 * 렌더링 메인
 */

import type { RenderContext } from '../types.js';
import { RESET } from '../utils/colors.js';
import { renderSessionLine } from './session-line.js';
import { renderRateLimitLines } from './rate-limit-line.js';
import { renderProjectLine, renderConfigCountsLine } from './project-line.js';
import { renderToolsLine, renderAgentsLine, renderTodosLine } from './activity-line.js';

/**
 * HUD 렌더링
 */
export function render(ctx: RenderContext): void {
  const lines: string[] = [];

  if (ctx.config.layout === 'multiline') {
    // 멀티라인 레이아웃
    const sessionLine = renderSessionLine(ctx);
    if (sessionLine) lines.push(sessionLine);

    // Rate Limit (여러 줄 가능)
    const rateLimitLines = renderRateLimitLines(ctx);
    lines.push(...rateLimitLines);

    // 프로젝트 + 설정 카운트 (한 줄로)
    const projectLine = renderProjectLine(ctx);
    const configCountsLine = renderConfigCountsLine(ctx);
    if (projectLine || configCountsLine) {
      const combinedParts = [projectLine, configCountsLine].filter(Boolean);
      lines.push(combinedParts.join(' │ '));
    }

    const toolsLine = renderToolsLine(ctx);
    if (toolsLine) lines.push(toolsLine);

    const agentsLine = renderAgentsLine(ctx);
    if (agentsLine) lines.push(agentsLine);

    const todosLine = renderTodosLine(ctx);
    if (todosLine) lines.push(todosLine);
  } else {
    // 컴팩트 레이아웃 - 모든 정보를 한 줄에
    const allParts: string[] = [];

    const sessionLine = renderSessionLine(ctx);
    if (sessionLine) allParts.push(sessionLine);

    // 컴팩트 모드에서는 Rate Limit 첫 줄만 사용
    const rateLimitLines = renderRateLimitLines(ctx);
    if (rateLimitLines.length > 0) allParts.push(rateLimitLines[0]);

    const projectLine = renderProjectLine(ctx);
    if (projectLine) allParts.push(projectLine);

    const configCountsLine = renderConfigCountsLine(ctx);
    if (configCountsLine) allParts.push(configCountsLine);

    if (allParts.length > 0) {
      lines.push(allParts.join(' │ '));
    }

    // 컴팩트 모드에서도 소넷 라인은 별도 줄로
    if (rateLimitLines.length > 1) {
      lines.push(rateLimitLines[1]);
    }

    // 활동 라인은 별도로
    const activityParts: string[] = [];

    const toolsLine = renderToolsLine(ctx);
    if (toolsLine) activityParts.push(toolsLine);

    const agentsLine = renderAgentsLine(ctx);
    if (agentsLine) activityParts.push(agentsLine);

    const todosLine = renderTodosLine(ctx);
    if (todosLine) activityParts.push(todosLine);

    if (activityParts.length > 0) {
      lines.push(activityParts.join(' │ '));
    }
  }

  // 출력
  for (const line of lines) {
    // 공백을 non-breaking space로 변환하여 터미널 호환성 향상
    const outputLine = `${RESET}${line.replace(/ /g, '\u00A0')}`;
    console.log(outputLine);
  }
}
