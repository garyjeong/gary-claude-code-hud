/**
 * 포맷팅 유틸리티
 */

/**
 * 토큰 수를 읽기 쉬운 형식으로 변환
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(0)}K`;
  }
  return tokens.toString();
}

/**
 * 세션 지속 시간 포맷팅
 */
export function formatSessionDuration(sessionStart?: Date): string {
  if (!sessionStart) return '';

  const now = Date.now();
  const ms = now - sessionStart.getTime();
  const mins = Math.floor(ms / 60000);

  if (mins < 1) return '<1분';
  if (mins < 60) return `${mins}분`;

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}시간 ${remainingMins}분`;
}

/**
 * 리셋 시간까지 남은 시간 포맷팅
 */
export function formatTimeRemaining(resetsAt: string): string {
  const resetDate = new Date(resetsAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();

  if (diffMs <= 0) return '곧';

  const diffMins = Math.ceil(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}분`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
}

/**
 * 모델명 축약
 */
export function shortenModelName(displayName?: string): string {
  if (!displayName) return 'Unknown';

  const name = displayName.toLowerCase();

  if (name.includes('opus')) return 'Opus';
  if (name.includes('sonnet')) return 'Sonnet';
  if (name.includes('haiku')) return 'Haiku';

  // 첫 번째 단어만 반환
  return displayName.split(' ')[0];
}

/**
 * 경과 시간 포맷팅 (도구/에이전트용)
 */
export function formatElapsedTime(startTime: Date, endTime?: Date): string {
  const end = endTime ?? new Date();
  const ms = end.getTime() - startTime.getTime();
  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) return `${seconds}초`;

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
}

/**
 * 파일 경로에서 파일명 추출
 */
export function extractFileName(filePath?: string): string {
  if (!filePath) return '';
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1] || '';
}

/**
 * 텍스트 자르기 (말줄임표 추가)
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
