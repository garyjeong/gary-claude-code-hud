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
 * 한도 초기화 시각 포맷팅 → "08-05 13시" 또는 "14시"
 *
 * 소스마다 형식이 다르다 — codex는 epoch 초, Anthropic usage API는 ISO 문자열.
 * 둘 다 받는다. 남은 시간("6일 후")만 보여주면 언제 풀리는지 알 수 없으므로
 * 절대 시각으로 표시하고, 24시간 안이면 "14시"처럼 시각만 남겨 폭을 줄인다.
 */
export function formatResetAt(at: number | string | undefined): string {
  if (!at) return '';
  const d = typeof at === 'number' ? new Date(at * 1000) : new Date(at);
  if (Number.isNaN(d.getTime())) return '';

  // 이미 지난 시각은 표시하지 않는다. 스냅샷이 오래됐을 때 지난 초기화 시각이
  // 곧 올 것처럼 읽히는 오해를 막는다.
  const diffMs = d.getTime() - Date.now();
  if (diffMs < 0) return '';

  const hh = String(d.getHours()).padStart(2, '0');
  if (diffMs < 86_400_000) return `${hh}시`;

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd} ${hh}시`;
}

/**
 * 초기화까지 남은 시간 포맷팅 → "1시간 30분" / "45분" / "곧"
 *
 * 5시간처럼 짧은 창은 절대 시각보다 남은 시간이 읽기 쉽다.
 * 7일·주간처럼 긴 창은 formatResetAt으로 절대 시각을 쓴다.
 */
export function formatRemaining(at: number | string | undefined): string {
  if (!at) return '';
  const d = typeof at === 'number' ? new Date(at * 1000) : new Date(at);
  if (Number.isNaN(d.getTime())) return '';

  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return '곧';

  const mins = Math.ceil(diffMs / 60_000);
  if (mins < 60) return `${mins}분`;

  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest > 0 ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

/**
 * 한도 윈도우(분)를 사람이 읽는 단위로 (10080 → "7일")
 */
export function formatWindow(minutes: number): string {
  if (!minutes) return '';
  if (minutes % 1440 === 0) return `${minutes / 1440}일`;
  if (minutes % 60 === 0) return `${minutes / 60}시간`;
  return `${minutes}분`;
}

/**
 * 비용 포맷팅 (USD). 1센트 미만은 자릿수를 늘려 0.00으로 뭉개지지 않게 한다.
 */
export function formatCostUsd(usd: number): string {
  if (usd >= 10) return `$${usd.toFixed(1)}`;
  if (usd >= 0.01) return `$${usd.toFixed(2)}`;
  if (usd > 0) return `$${usd.toFixed(4)}`;
  return '$0';
}

/**
 * 모델명 축약
 */
export function shortenModelName(displayName?: string, modelId?: string): string {
  if (!displayName && !modelId) return 'Unknown';

  // model.id에서 버전 추출 (예: "claude-opus-4-6" → "4.6")
  let version = '';
  if (modelId) {
    const versionMatch = modelId.match(/(\d+)-(\d+)/);
    if (versionMatch) {
      version = ` ${versionMatch[1]}.${versionMatch[2]}`;
    }
  }

  const name = (displayName ?? modelId ?? '').toLowerCase();

  if (name.includes('opus')) return `Opus${version}`;
  if (name.includes('sonnet')) return `Sonnet${version}`;
  if (name.includes('haiku')) return `Haiku${version}`;

  return displayName ?? modelId ?? 'Unknown';
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
