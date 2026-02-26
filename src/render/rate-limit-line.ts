/**
 * Rate Limit 라인 렌더링
 * 색상 테마: 노랑 계열
 */

import type { RenderContext } from '../types.js';
import { LABELS } from '../types.js';
import { ICON } from '../constants.js';
import { getColorForPercent, colorize, yellow, dim } from '../utils/colors.js';

/**
 * Rate Limit을 단일 파트로 반환
 * 형식: 사용량 : 15%(5시간) / 2%(7일) / 0%(소넷)
 */
export function renderRateLimitParts(ctx: RenderContext): string[] {
  if (!ctx.config.display.showRateLimit) {
    return [];
  }

  const limits = ctx.rateLimits;
  if (!limits) {
    return [`${yellow(ICON.rateLimit)} ${yellow(ICON.warning)}`];
  }

  const items: string[] = [];

  // 5시간 윈도우
  if (limits.five_hour) {
    const pct = Math.round(limits.five_hour.utilization);
    const color = getColorForPercent(pct);
    items.push(`${colorize(`${pct}%`, color)}${dim(`(${LABELS.fiveHour})`)}`);
  }

  // Max 플랜인 경우 7일 전체
  const isMaxPlan = ctx.config.plan === 'max100' || ctx.config.plan === 'max200';

  if (isMaxPlan && limits.seven_day) {
    const pct = Math.round(limits.seven_day.utilization);
    const color = getColorForPercent(pct);
    items.push(`${colorize(`${pct}%`, color)}${dim(`(${LABELS.sevenDay})`)}`);
  }

  // 7일 소넷 (Max 플랜인 경우)
  if (isMaxPlan && limits.seven_day_sonnet) {
    const pct = Math.round(limits.seven_day_sonnet.utilization);
    const color = getColorForPercent(pct);
    items.push(`${colorize(`${pct}%`, color)}${dim(`(${LABELS.sevenDaySonnet})`)}`);
  }

  if (items.length === 0) return [];

  return [`${yellow(ICON.rateLimit)} ${items.join(dim(' / '))}`];
}
