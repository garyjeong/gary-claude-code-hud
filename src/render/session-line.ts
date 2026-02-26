/**
 * 세션 라인 렌더링 (모델 + 컨텍스트)
 * 색상 테마: 녹색 계열
 */

import type { RenderContext } from '../types.js';
import { ICON, AUTOCOMPACT_BUFFER } from '../constants.js';
import { green, cyan, renderDotBar, getColorForPercent, colorize, dim, RESET } from '../utils/colors.js';
import { shortenModelName, formatTokens } from '../utils/formatters.js';
import { getContextPercent, getCurrentTokens, getTotalTokens } from '../utils/stdin.js';

/**
 * 세션 라인 렌더링
 */
export function renderSessionLine(ctx: RenderContext): string | null {
  const parts: string[] = [];

  // 모델명 + 세션 시간
  const modelName = shortenModelName(ctx.stdin.model?.display_name, ctx.stdin.model?.id);
  if (ctx.config.display.showSessionDuration && ctx.sessionDuration) {
    parts.push(`${green(ICON.model)} ${green(modelName)}${dim(`(${ctx.sessionDuration})`)}`);
  } else {
    parts.push(`${green(ICON.model)} ${green(modelName)}`);
  }

  // 컨텍스트 사용량 (showContext 설정에 따라)
  if (ctx.config.display.showContext) {
    const percent = getContextPercent(ctx.stdin, AUTOCOMPACT_BUFFER);
    const currentTokens = getCurrentTokens(ctx.stdin, AUTOCOMPACT_BUFFER);
    const totalTokens = getTotalTokens(ctx.stdin);

    const bar = renderDotBar(percent);
    parts.push(bar);

    const percentColor = getColorForPercent(percent);
    parts.push(colorize(`${percent}%`, percentColor));

    parts.push(dim(`${formatTokens(currentTokens)}/${formatTokens(totalTokens)}`));
  }

  return parts.join(' ');
}
