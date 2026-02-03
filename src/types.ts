/**
 * gary-claude-code-hud 타입 정의
 */

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
  showSessionDuration: boolean;
}

export interface Config {
  plan: PlanType;
  layout: LayoutType;
  display: DisplayConfig;
  cache: {
    ttlSeconds: number;
  };
}

export const DEFAULT_CONFIG: Config = {
  plan: 'max200',
  layout: 'multiline',
  display: {
    showContext: true,
    showRateLimit: true,
    showProject: true,
    showGit: true,
    showTools: false,
    showAgents: true,
    showTodos: true,
    showConfigCounts: true,
    showSessionDuration: true,
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
  seven_day_sonnet?: RateLimitInfo;
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
  sessionDuration: string;
  rateLimits: UsageLimits | null;
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
  sevenDaySonnet: '소넷',
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
  claudeMd: 'CLAUDE:',
  agentsMd: 'AGENTS:',
  rules: '규칙:',
  mcps: 'MCP:',
  hooks: '훅:',
  skills: '스킬:',
} as const;
