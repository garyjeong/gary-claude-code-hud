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
  if (!ctx.config.display.showContext) {
    return null;
  }

  const parts: string[] = [];

  // 모델명 (녹색 테마)
  const modelName = shortenModelName(ctx.stdin.model?.display_name);
  parts.push(`${green(ICON.model)} ${green(modelName)}`);

  // 컨텍스트 사용량
  const percent = getContextPercent(ctx.stdin, AUTOCOMPACT_BUFFER);
  const currentTokens = getCurrentTokens(ctx.stdin, AUTOCOMPACT_BUFFER);
  const totalTokens = getTotalTokens(ctx.stdin);

  // 진행바
  const bar = renderDotBar(percent);
  parts.push(bar);

  // 퍼센트
  const percentColor = getColorForPercent(percent);
  parts.push(colorize(`${percent}%`, percentColor));

  // 토큰 (현재/전체)
  parts.push(dim(`${formatTokens(currentTokens)}/${formatTokens(totalTokens)}`));

  // 세션 시간
  if (ctx.config.display.showSessionDuration && ctx.sessionDuration) {
    parts.push(`${dim(ICON.session)} ${dim(ctx.sessionDuration)}`);
  }

  return parts.join(' ');
}
