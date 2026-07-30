/**
 * 외부 CLI(codex / grok) 사용량 라인 렌더링
 * 색상 테마: 마젠타 계열 (기존 녹색=세션, 노랑=사용량, 시안=프로젝트와 구분)
 *
 * 두 CLI의 표시 항목이 다른 이유:
 *  - codex는 서버가 rate_limits를 내려주므로 한도 %와 초기화 시각을 보여준다.
 *  - grok은 한도를 아예 노출하지 않아 토큰·비용·호출 수만 보여준다.
 */

import type { RenderContext } from '../types.js';
import { LABELS } from '../types.js';
import { ICON } from '../constants.js';
import { magenta, dim, getColorForPercent, colorize, codexName, grokName } from '../utils/colors.js';
import { formatTokens, formatResetAt, formatWindow, formatCostUsd } from '../utils/formatters.js';

export function renderExternalLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showExternalUsage) return null;

  const ext = ctx.externalUsage;
  if (!ext) return null;

  const items: string[] = [];

  // codex — 한도 % + 창 누적 토큰(계정 전역) + (윈도우·초기화 시각)
  if (ext.codex) {
    const { usedPercent, windowMinutes, resetsAt, windowTokens, truncated } = ext.codex;
    const pct = Math.round(usedPercent);

    let part = `${codexName(LABELS.codex)} ${colorize(`${pct}%`, getColorForPercent(pct))}`;
    if (windowTokens) part += ` ${dim(formatTokens(windowTokens))}${truncated ? dim('+') : ''}`;

    const meta = [formatWindow(windowMinutes), formatResetAt(resetsAt)].filter(Boolean).join('·');
    if (meta) part += dim(`(${meta})`);
    items.push(part);
  }

  // grok — 주간 창 누적 토큰 + 비용 (한도 %는 CLI로 얻을 수 없다)
  // 초기화 시각을 함께 보여줘 grok.com 사용량 화면과 같은 창임을 알 수 있게 한다.
  if (ext.grok) {
    const { totalTokens, costUsd, resetsAt, truncated, aligned } = ext.grok;
    let part = `${grokName(LABELS.grok)} ${magenta(formatTokens(totalTokens))}`;
    // 세션 상한에 걸려 일부가 빠졌으면 합계가 과소 집계임을 숨기지 않는다.
    if (truncated) part += dim('+');
    if (costUsd > 0) part += ` ${magenta(formatCostUsd(costUsd))}`;

    // 앵커에 정렬된 창이면 '주간·초기화시각', 폴백이면 '7일'(롤링)로 구분한다.
    const meta = aligned
      ? [LABELS.weekly, formatResetAt(resetsAt)].filter(Boolean).join('·')
      : LABELS.sevenDay;
    if (meta) part += dim(`(${meta})`);
    items.push(part);
  }

  if (items.length === 0) return null;

  return `${magenta(ICON.external)} ${items.join(dim(' │ '))}`;
}
