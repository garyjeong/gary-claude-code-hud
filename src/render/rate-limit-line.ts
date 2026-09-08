/**
 * Rate Limit 라인 렌더링
 * 색상 테마: 노랑 계열
 */

import type { RenderContext } from '../types.js';
import { LABELS } from '../types.js';
import { ICON } from '../constants.js';
import { getColorForPercent, colorize, yellow, dim } from '../utils/colors.js';
import { formatRemaining, formatResetAt } from '../utils/formatters.js';

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

  // 5시간 윈도우 — 초기화 시각을 함께 표시한다(모델명 옆 잔여시간 표기를 대체).
  if (limits.five_hour) {
    const pct = Math.round(limits.five_hour.utilization);
    const color = getColorForPercent(pct);
    const meta = [LABELS.fiveHour, formatRemaining(limits.five_hour.resets_at)]
      .filter(Boolean)
      .join('·');
    items.push(`${colorize(`${pct}%`, color)}${dim(`(${meta})`)}`);
  }

  // Max 플랜인 경우 7일 전체
  // 소넷 주간 한도는 별도 측정이 없어져 표시하지 않는다(사용자 결정).
  const isMaxPlan = ctx.config.plan === 'max100' || ctx.config.plan === 'max200';

  // 7일 창도 초기화 시각을 함께 보여준다. 남은 일수가 길어 "언제 풀리는가"가
  // 5시간 창보다 오히려 더 안 잡히므로, 절대 시각(formatResetAt)으로 적는다.
  if (isMaxPlan && limits.seven_day) {
    const pct = Math.round(limits.seven_day.utilization);
    const color = getColorForPercent(pct);
    const meta = [LABELS.sevenDay, formatResetAt(limits.seven_day.resets_at)]
      .filter(Boolean)
      .join('·');
    items.push(`${colorize(`${pct}%`, color)}${dim(`(${meta})`)}`);
  }

  if (items.length === 0) return [];

  return [`${yellow(ICON.rateLimit)} ${items.join(dim(' / '))}`];
}
