/**
 * ANSI 색상 유틸리티
 */

// ANSI 색상 코드
export const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',

  // 기본 색상
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // 밝은 색상
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
} as const;

export const RESET = COLORS.reset;

/**
 * 텍스트에 색상 적용
 */
export function colorize(text: string, color: string): string {
  return `${color}${text}${RESET}`;
}

/**
 * 퍼센트에 따른 색상 반환
 */
export function getColorForPercent(percent: number): string {
  if (percent >= 90) return COLORS.red;
  if (percent >= 75) return COLORS.yellow;
  if (percent >= 50) return COLORS.brightYellow;
  return COLORS.green;
}

/**
 * 도트 진행바 렌더링
 */
export function renderDotBar(percent: number, length = 10): string {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;

  const color = getColorForPercent(percent);
  const filledPart = colorize('●'.repeat(filled), color);
  const emptyPart = colorize('○'.repeat(empty), COLORS.dim);

  return `${filledPart}${emptyPart}`;
}

/**
 * dim 텍스트
 */
export function dim(text: string): string {
  return colorize(text, COLORS.dim);
}

/**
 * 색상 함수들
 */
export const cyan = (text: string) => colorize(text, COLORS.cyan);
export const yellow = (text: string) => colorize(text, COLORS.yellow);
export const green = (text: string) => colorize(text, COLORS.green);
export const red = (text: string) => colorize(text, COLORS.red);
export const magenta = (text: string) => colorize(text, COLORS.magenta);
export const blue = (text: string) => colorize(text, COLORS.blue);
export const bold = (text: string) => colorize(text, COLORS.bold);
