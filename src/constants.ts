/**
 * gary-claude-code-hud 상수 정의
 */

// 자동 압축 버퍼 (Claude Code의 autocompact 기능 고려)
export const AUTOCOMPACT_BUFFER = 5000;

// API 타임아웃 (ms)
export const API_TIMEOUT_MS = 5000;

// 429 Rate Limit 기본 백오프 (ms) - Retry-After 헤더 없을 때 사용
export const RATE_LIMIT_BACKOFF_MS = 300_000; // 5분

// 캐시 경로
export const CACHE_DIR = '.claude';
export const CACHE_FILE = 'gary-claude-code-hud-cache.json';
export const EXTERNAL_CACHE_FILE = 'gary-claude-code-hud-external-cache.json';
export const CONFIG_FILE = 'gary-claude-code-hud.local.json';

// 진행바 설정
export const PROGRESS_BAR = {
  length: 10,
  filled: '●',
  empty: '○',
} as const;

// 아이콘 (직관적 텍스트 + 콜론, 앞뒤 공백)
export const ICON = {
  model: '모델 :',
  context: '컨텍스트 :',
  rateLimit: '사용량 :',
  external: '외부 :',
  project: '프로젝트 :',
  git: 'Git :',
  tools: '도구 :',
  agents: '에이전트 :',
  todos: '할일 :',
  session: '세션 :',
  warning: '(!)',
  error: '(X)',
  success: '(v)',
  running: '>>',
  pending: '[ ]',
  completed: '[v]',
} as const;

// grok 주간 한도 초기화 기준시각 (로컬 시간).
// grok CLI는 한도를 API로 노출하지 않으므로, grok.com 설정 → 사용량에 표시되는
// 초기화 시각을 앵커로 두고 7일 주기를 계산해 같은 창으로 집계를 맞춘다.
// 계정마다 다르고 바뀔 수 있어 설정(grokWeekAnchor)으로 덮어쓸 수 있다.
export const GROK_WEEK_ANCHOR = '2026-08-04T14:19:00';

// grok 주간 한도(USD 환산). grok은 한도를 CLI·세션 파일 어디에도 노출하지 않고
// grok.com 사용량 화면도 %만 보여준다(한도 절대값 없음). 그래서 관측 한 쌍으로 역산한다.
//   2026-09-08 실측: 창 누적 $2.59 ↔ 화면 표시 1%  →  약 $259/주
// ★이 값은 정밀하지 않다. 화면 %가 반올림이라 1%는 실제 0.5~1.49%이고,
//   그만큼 한도는 $173~$518 범위다. 표시된 %가 커진 시점(10% 이상)에
//   다시 역산하면 오차가 그 비율만큼 줄어든다.
// 비용을 분모로 쓰는 이유: grok 한도는 크레딧(금액) 개념이고, costUsdTicks는 서버가
// 계산해 내려준 값이라 모델별 가중치가 이미 반영돼 있다. 토큰 합계는 그렇지 않다.
// 0으로 두면 %를 표시하지 않고 토큰·비용만 보여준다.
export const GROK_WEEK_COST_LIMIT_USD = 259;

// 컨텍스트 임계값 (%)
export const CONTEXT_THRESHOLDS = {
  low: 50,
  medium: 75,
  high: 90,
} as const;
