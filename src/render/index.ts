/**
 * 렌더링 메인
 */

import type { RenderContext } from '../types.js';
import { RESET } from '../utils/colors.js';
import { renderSessionLine } from './session-line.js';
import { renderRateLimitParts } from './rate-limit-line.js';
import { renderProjectLine, renderConfigCountsLine } from './project-line.js';
import { renderToolsLine, renderAgentsLine, renderTodosLine } from './activity-line.js';

/**
 * HUD 렌더링
 */
export function render(ctx: RenderContext): void {
  const lines: string[] = [];

  if (ctx.config.layout === 'multiline') {
    // 멀티라인 레이아웃

    // 모델 + 사용량 (한 줄)
    const firstLineParts: string[] = [];
    const sessionLine = renderSessionLine(ctx);
    if (sessionLine) firstLineParts.push(sessionLine);
    const rateLimitParts = renderRateLimitParts(ctx);
    firstLineParts.push(...rateLimitParts);
    if (firstLineParts.length > 0) {
      lines.push(firstLineParts.join(' │ '));
    }

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

    const rateLimitParts = renderRateLimitParts(ctx);
    allParts.push(...rateLimitParts);

    const projectLine = renderProjectLine(ctx);
    if (projectLine) allParts.push(projectLine);

    const configCountsLine = renderConfigCountsLine(ctx);
    if (configCountsLine) allParts.push(configCountsLine);

    if (allParts.length > 0) {
      lines.push(allParts.join(' │ '));
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
