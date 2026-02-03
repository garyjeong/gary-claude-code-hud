/**
 * 트랜스크립트 파싱 유틸리티
 */

import * as fs from 'node:fs';
import * as readline from 'node:readline';
import * as path from 'node:path';
import * as os from 'node:os';
import type { TranscriptData, ToolEntry, AgentEntry, TodoEntry } from '../types.js';

interface TranscriptLine {
  timestamp?: string;
  message?: {
    content?: ContentBlock[];
  };
}

interface ContentBlock {
  type: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  is_error?: boolean;
}

/**
 * 트랜스크립트 경로 유효성 검사
 */
function isValidTranscriptPath(p: string): boolean {
  if (!p) return false;
  if (!path.isAbsolute(p)) return false;

  // ~/.claude 디렉토리 내의 경로만 허용
  const claudeDir = path.join(os.homedir(), '.claude');
  try {
    return p.startsWith(claudeDir) && fs.existsSync(p);
  } catch {
    return false;
  }
}

/**
 * 트랜스크립트 파싱
 */
export async function parseTranscript(transcriptPath: string): Promise<TranscriptData> {
  const result: TranscriptData = {
    tools: [],
    agents: [],
    todos: [],
  };

  if (!isValidTranscriptPath(transcriptPath)) {
    return result;
  }

  const toolMap = new Map<string, ToolEntry>();
  const agentMap = new Map<string, AgentEntry>();
  let latestTodos: TodoEntry[] = [];

  try {
    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line) as TranscriptLine;
        processEntry(entry, toolMap, agentMap, latestTodos, result);
      } catch {
        // 잘못된 라인 무시
      }
    }
  } catch {
    // 오류 시 부분 결과 반환
  }

  // 최근 20개 도구, 10개 에이전트만 유지
  result.tools = Array.from(toolMap.values()).slice(-20);
  result.agents = Array.from(agentMap.values()).slice(-10);
  result.todos = latestTodos;

  return result;
}

/**
 * 트랜스크립트 엔트리 처리
 */
function processEntry(
  entry: TranscriptLine,
  toolMap: Map<string, ToolEntry>,
  agentMap: Map<string, AgentEntry>,
  latestTodos: TodoEntry[],
  result: TranscriptData
): void {
  const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();

  // 세션 시작 시간 기록
  if (!result.sessionStart && entry.timestamp) {
    result.sessionStart = timestamp;
  }

  const content = entry.message?.content;
  if (!content || !Array.isArray(content)) return;

  for (const block of content) {
    // 도구 사용 시작
    if (block.type === 'tool_use' && block.id && block.name) {
      const toolEntry: ToolEntry = {
        id: block.id,
        name: block.name,
        target: extractTarget(block.name, block.input),
        status: 'running',
        startTime: timestamp,
      };

      // Task 도구는 에이전트로 처리
      if (block.name === 'Task') {
        const input = block.input as Record<string, unknown>;
        const agentEntry: AgentEntry = {
          id: block.id,
          type: (input?.subagent_type as string) ?? 'unknown',
          model: (input?.model as string) ?? undefined,
          description: (input?.description as string) ?? undefined,
          status: 'running',
          startTime: timestamp,
        };
        agentMap.set(block.id, agentEntry);
      } else if (block.name === 'TodoWrite' || block.name === 'TaskCreate' || block.name === 'TaskUpdate') {
        // Todo 업데이트
        const input = block.input as { todos?: TodoEntry[] };
        if (input?.todos && Array.isArray(input.todos)) {
          latestTodos.length = 0;
          latestTodos.push(...input.todos);
        }
      } else {
        toolMap.set(block.id, toolEntry);
      }
    }

    // 도구 실행 완료
    if (block.type === 'tool_result' && block.tool_use_id) {
      const tool = toolMap.get(block.tool_use_id);
      if (tool) {
        tool.status = block.is_error ? 'error' : 'completed';
        tool.endTime = timestamp;
      }

      const agent = agentMap.get(block.tool_use_id);
      if (agent) {
        agent.status = 'completed';
        agent.endTime = timestamp;
      }
    }
  }
}

/**
 * 도구 입력에서 대상 추출
 */
function extractTarget(toolName: string, input?: Record<string, unknown>): string | undefined {
  if (!input) return undefined;

  switch (toolName) {
    case 'Read':
    case 'Write':
    case 'Edit':
      return (input.file_path as string) ?? (input.path as string);
    case 'Glob':
    case 'Grep':
      return input.pattern as string;
    case 'Bash': {
      const cmd = input.command as string;
      return cmd?.slice(0, 30) + (cmd && cmd.length > 30 ? '…' : '');
    }
    case 'WebFetch':
      return input.url as string;
    default:
      return undefined;
  }
}
