/**
 * gary-claude-code-hud 타입 정의
 */

import { GROK_WEEK_ANCHOR } from './constants.js';

// ============================================================================
// stdin 입력 타입
// ============================================================================

export interface StdinInput {
  model?: {
    id?: string;
    display_name?: string;
  };
  context_window?: {
    context_window_size?: number;
    current_usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    } | null;
    used_percentage?: number | null;
    remaining_percentage?: number | null;
  };
  cost?: {
    total_cost_usd?: number;
  };
  cwd?: string;
  transcript_path?: string;
}

// ============================================================================
// 설정 타입
// ============================================================================

export type PlanType = 'pro' | 'max100' | 'max200' | 'team';
export type LayoutType = 'multiline' | 'compact';

export interface DisplayConfig {
  showContext: boolean;
  showRateLimit: boolean;
  showProject: boolean;
  showGit: boolean;
  showTools: boolean;
  showAgents: boolean;
  showTodos: boolean;
  showConfigCounts: boolean;
  /** codex·grok 외부 CLI 사용량 라인 */
  showExternalUsage: boolean;
}

export interface Config {
  plan: PlanType;
  layout: LayoutType;
  /**
   * grok 주간 한도 초기화 기준시각 (로컬 ISO, 예: 2026-08-04T14:19:00).
   * grok.com 설정 → 사용량에 표시된 초기화 시각을 넣으면 그 창으로 집계된다.
   */
  grokWeekAnchor: string;
  display: DisplayConfig;
  cache: {
    ttlSeconds: number;
  };
}

export const DEFAULT_CONFIG: Config = {
  plan: 'max200',
  layout: 'multiline',
  grokWeekAnchor: GROK_WEEK_ANCHOR,
  display: {
    showContext: true,
    showRateLimit: true,
    showProject: true,
    showGit: true,
    showTools: false,
    showAgents: true,
    showTodos: true,
    showConfigCounts: true,
    showExternalUsage: true,
  },
  cache: {
    ttlSeconds: 60,
  },
};

// ============================================================================
// Rate Limit 타입
// ============================================================================

export interface RateLimitInfo {
  utilization: number;
  resets_at?: string;
}

export interface UsageLimits {
  five_hour?: RateLimitInfo;
  seven_day?: RateLimitInfo;
}

// ============================================================================
// 외부 CLI(codex / grok) 사용량 타입
// ============================================================================

export interface ExternalUsage {
  /** codex는 한도 %와 초기화 시각까지 제공한다 */
  codex: import('./utils/codex-usage.js').CodexUsage | null;
  /** grok은 한도를 노출하지 않아 토큰·비용만 있다 */
  grok: import('./utils/grok-usage.js').GrokUsage | null;
}

// ============================================================================
// 설정 파일 카운트 타입
// ============================================================================

export interface ConfigCounts {
  claudeMdCount: number;
  agentsMdCount: number;
  rulesCount: number;
  mcpCount: number;
  hooksCount: number;
  skillsCount: number;
}

// ============================================================================
// 트랜스크립트 타입
// ============================================================================

export interface ToolEntry {
  id: string;
  name: string;
  target?: string;
  status: 'running' | 'completed' | 'error';
  startTime: Date;
  endTime?: Date;
}

export interface AgentEntry {
  id: string;
  type: string;
  model?: string;
  description?: string;
  status: 'running' | 'completed';
  startTime: Date;
  endTime?: Date;
}

export interface TodoEntry {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface TranscriptData {
  sessionStart?: Date;
  tools: ToolEntry[];
  agents: AgentEntry[];
  todos: TodoEntry[];
}

// ============================================================================
// 렌더 컨텍스트 타입
// ============================================================================

export interface RenderContext {
  stdin: StdinInput;
  config: Config;
  transcript: TranscriptData;
  configCounts: ConfigCounts;
  gitBranch?: string;
  gitDirty?: boolean;
  rateLimits: UsageLimits | null;
  externalUsage: ExternalUsage | null;
}

// ============================================================================
// 한국어 레이블
// ============================================================================

export const LABELS = {
  model: '모델',
  context: '컨텍스트',
  rateLimit: '사용량',
  fiveHour: '5시간',
  sevenDay: '7일',
  sevenDayAll: '전체',
  external: '외부',
  codex: 'codex',
  grok: 'grok',
  weekly: '주간',
  project: '프로젝트',
  git: 'Git',
  tools: '도구',
  agents: '에이전트',
  todos: '할일',
  session: '세션',
  running: '실행중',
  completed: '완료',
  error: '오류',
  noData: '데이터 없음',
  resetIn: '리셋',
  hours: '시간',
  minutes: '분',
  claudeMd: 'CLAUDE.md :',
  agentsMd: 'AGENTS.md :',
  rules: '규칙 :',
  mcps: 'MCPs :',
  hooks: '훅 :',
  skills: 'Skills :',
} as const;
