/**
 * gary-claude-code-hud 상수 정의
 */

// 자동 압축 버퍼 (Claude Code의 autocompact 기능 고려)
export const AUTOCOMPACT_BUFFER = 5000;

// API 타임아웃 (ms)
export const API_TIMEOUT_MS = 5000;

// 캐시 경로
export const CACHE_DIR = '.claude';
export const CACHE_FILE = 'gary-claude-code-hud-cache.json';
export const CONFIG_FILE = 'gary-claude-code-hud.local.json';

// 진행바 설정
export const PROGRESS_BAR = {
  length: 10,
  filled: '●',
  empty: '○',
} as const;

// 아이콘 (직관적 텍스트 + 콜론)
export const ICON = {
  model: '모델:',
  context: '컨텍스트:',
  rateLimit: '사용량:',
  sonnet: '└ 소넷:',
  project: '프로젝트:',
  git: 'Git:',
  tools: '도구:',
  agents: '에이전트:',
  todos: '할일:',
  session: '세션:',
  warning: '(!)',
  error: '(X)',
  success: '(v)',
  running: '>>',
  pending: '[ ]',
  completed: '[v]',
} as const;

// 컨텍스트 임계값 (%)
export const CONTEXT_THRESHOLDS = {
  low: 50,
  medium: 75,
  high: 90,
} as const;
