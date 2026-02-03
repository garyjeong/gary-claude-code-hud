/**
 * 활동 라인 렌더링 (도구, 에이전트, Todo)
 */

import type { RenderContext, ToolEntry, AgentEntry, TodoEntry } from '../types.js';
import { LABELS } from '../types.js';
import { ICON } from '../constants.js';
import { cyan, green, red, yellow, dim, magenta, blue } from '../utils/colors.js';
import { formatElapsedTime, extractFileName, truncate } from '../utils/formatters.js';

/**
 * 도구 라인 렌더링
 */
export function renderToolsLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showTools) {
    return null;
  }

  const tools = ctx.transcript.tools;
  if (tools.length === 0) {
    return null;
  }

  // 실행 중인 도구와 최근 완료된 도구
  const runningTools = tools.filter((t) => t.status === 'running');
  const recentTools = tools.filter((t) => t.status !== 'running').slice(-3);

  const parts: string[] = [`${yellow(ICON.tools)}`];

  // 실행 중인 도구
  if (runningTools.length > 0) {
    const runningParts = runningTools.map((tool) => {
      const elapsed = formatElapsedTime(tool.startTime);
      const target = tool.target ? ` ${dim(truncate(extractFileName(tool.target), 20))}` : '';
      return `${yellow(ICON.running)} ${cyan(tool.name)}${target} ${dim(`(${elapsed})`)}`;
    });
    parts.push(runningParts.join(' '));
  }

  // 최근 완료된 도구
  if (recentTools.length > 0 && runningTools.length === 0) {
    const recentParts = recentTools.map((tool) => {
      const icon = tool.status === 'error' ? ICON.error : ICON.success;
      const color = tool.status === 'error' ? red : green;
      return color(`${icon} ${tool.name}`);
    });
    parts.push(recentParts.join(' '));
  }

  // 통계
  const running = runningTools.length;
  const completed = tools.filter((t) => t.status === 'completed').length;
  const errors = tools.filter((t) => t.status === 'error').length;

  const stats: string[] = [];
  if (running > 0) stats.push(`${LABELS.running}: ${running}`);
  if (completed > 0) stats.push(`${LABELS.completed}: ${completed}`);
  if (errors > 0) stats.push(red(`${LABELS.error}: ${errors}`));

  if (stats.length > 0) {
    parts.push(dim(`(${stats.join(', ')})`));
  }

  return parts.join(' ');
}

/**
 * 에이전트 라인 렌더링
 */
export function renderAgentsLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showAgents) {
    return null;
  }

  const agents = ctx.transcript.agents;
  if (agents.length === 0) {
    return null;
  }

  // 실행 중인 에이전트
  const runningAgents = agents.filter((a) => a.status === 'running');

  const parts: string[] = [`${blue(ICON.agents)}`];

  if (runningAgents.length > 0) {
    const agentParts = runningAgents.map((agent) => {
      const elapsed = formatElapsedTime(agent.startTime);
      return `${yellow(ICON.running)} ${magenta(agent.type)} ${dim(`(${elapsed})`)}`;
    });
    parts.push(agentParts.join(' '));
  } else {
    // 최근 완료된 에이전트
    const recentAgents = agents.slice(-2);
    const recentParts = recentAgents.map((agent) => {
      return green(`${ICON.success} ${agent.type}`);
    });
    parts.push(recentParts.join(' '));
  }

  // 통계
  const running = runningAgents.length;
  const completed = agents.filter((a) => a.status === 'completed').length;

  parts.push(dim(`(${LABELS.running}: ${running}, ${LABELS.completed}: ${completed})`));

  return parts.join(' ');
}

/**
 * Todo 라인 렌더링
 */
export function renderTodosLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showTodos) {
    return null;
  }

  const todos = ctx.transcript.todos;
  if (todos.length === 0) {
    return null;
  }

  const pending = todos.filter((t) => t.status === 'pending').length;
  const inProgress = todos.filter((t) => t.status === 'in_progress').length;
  const completed = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const parts: string[] = [`${green(ICON.todos)}`];

  // 진행률
  parts.push(`${green(`${completed}`)}/${total} (${percent}%)`);

  // 현재 진행 중인 항목
  const currentTodo = todos.find((t) => t.status === 'in_progress');
  if (currentTodo) {
    parts.push(`${yellow(ICON.running)} ${cyan(truncate(currentTodo.content, 30))}`);
  }

  // 상태 아이콘 표시
  const statusIcons = todos.slice(0, 8).map((todo) => {
    switch (todo.status) {
      case 'completed':
        return green(ICON.completed);
      case 'in_progress':
        return yellow(ICON.running);
      default:
        return dim(ICON.pending);
    }
  });
  parts.push(statusIcons.join(''));

  return parts.join(' ');
}
