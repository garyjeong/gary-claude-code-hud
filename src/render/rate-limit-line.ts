/**
 * Rate Limit 라인 렌더링
 * 색상 테마: 노랑 계열
 */

import type { RenderContext } from '../types.js';
import { LABELS } from '../types.js';
import { ICON } from '../constants.js';
import { renderDotBar, getColorForPercent, colorize, dim, yellow, RESET } from '../utils/colors.js';
import { formatTimeRemaining } from '../utils/formatters.js';

/**
 * Rate Limit 라인 렌더링 (여러 줄 반환)
 * - 1줄: 5시간 + 7일 전체
 * - 2줄: 7일 소넷 (Max 플랜인 경우)
 */
export function renderRateLimitLines(ctx: RenderContext): string[] {
  if (!ctx.config.display.showRateLimit) {
    return [];
  }

  const limits = ctx.rateLimits;
  if (!limits) {
    return [`${yellow(ICON.rateLimit)} ${yellow(ICON.warning)}`];
  }

  const lines: string[] = [];

  // === 첫 번째 줄: 5시간 + 7일 전체 ===
  const firstLineParts: string[] = [];

  // 5시간 윈도우 (노랑 테마)
  if (limits.five_hour) {
    const pct = Math.round(limits.five_hour.utilization);
    const bar = renderDotBar(pct, 5);
    const color = getColorForPercent(pct);

    let text = `${yellow(ICON.rateLimit)} ${yellow(LABELS.fiveHour)} : ${bar} ${colorize(`${pct}%`, color)}`;

    if (limits.five_hour.resets_at) {
      const remaining = formatTimeRemaining(limits.five_hour.resets_at);
      text += dim(` (${remaining})`);
    }

    firstLineParts.push(text);
  }

  // Max 플랜인 경우 7일 전체도 첫 번째 줄에 추가
  const isMaxPlan = ctx.config.plan === 'max100' || ctx.config.plan === 'max200';

  if (isMaxPlan && limits.seven_day) {
    const pct = Math.round(limits.seven_day.utilization);
    const bar = renderDotBar(pct, 5);
    const color = getColorForPercent(pct);

    let text = `${yellow(LABELS.sevenDay)} : ${bar} ${colorize(`${pct}%`, color)}`;

    if (limits.seven_day.resets_at) {
      const remaining = formatTimeRemaining(limits.seven_day.resets_at);
      text += dim(` (${remaining})`);
    }

    firstLineParts.push(text);
  }

  if (firstLineParts.length > 0) {
    lines.push(firstLineParts.join(' │ '));
  }

  // === 두 번째 줄: 7일 소넷 (Max 플랜인 경우) ===
  if (isMaxPlan && limits.seven_day_sonnet) {
    const pct = Math.round(limits.seven_day_sonnet.utilization);
    const bar = renderDotBar(pct, 5);
    const color = getColorForPercent(pct);

    let text = `${yellow(ICON.sonnet)} ${bar} ${colorize(`${pct}%`, color)}`;

    if (limits.seven_day_sonnet.resets_at) {
      const remaining = formatTimeRemaining(limits.seven_day_sonnet.resets_at);
      text += dim(` (${remaining})`);
    }

    lines.push(text);
  }

  return lines;
}
