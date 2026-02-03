/**
 * stdin 읽기 유틸리티
 */

import type { StdinInput } from '../types.js';

/**
 * stdin에서 JSON 데이터 읽기
 */
export async function readStdin(): Promise<StdinInput | null> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    const content = Buffer.concat(chunks).toString('utf-8');
    return JSON.parse(content) as StdinInput;
  } catch {
    return null;
  }
}

/**
 * 컨텍스트 사용률 계산 (버퍼 포함)
 */
export function getContextPercent(stdin: StdinInput, buffer = 5000): number {
  // 네이티브 퍼센트가 있으면 사용 (Claude Code 2.1.6+)
  if (stdin.context_window?.used_percentage != null) {
    return Math.round(stdin.context_window.used_percentage);
  }

  const usage = stdin.context_window?.current_usage;
  const total = stdin.context_window?.context_window_size;

  if (!usage || !total) return 0;

  const baseTokens =
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0);

  const currentTokens = baseTokens + buffer;
  return Math.min(100, Math.round((currentTokens / total) * 100));
}

/**
 * 현재 토큰 수 계산
 */
export function getCurrentTokens(stdin: StdinInput, buffer = 5000): number {
  const usage = stdin.context_window?.current_usage;
  if (!usage) return 0;

  return (
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    buffer
  );
}

/**
 * 전체 토큰 수
 */
export function getTotalTokens(stdin: StdinInput): number {
  return stdin.context_window?.context_window_size ?? 0;
}

/**
 * 모델명 가져오기
 */
export function getModelName(stdin: StdinInput): string {
  return stdin.model?.display_name ?? stdin.model?.id ?? 'Unknown';
}
