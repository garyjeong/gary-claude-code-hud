/**
 * 프로젝트/Git 라인 렌더링
 */

import type { RenderContext } from '../types.js';
import { LABELS } from '../types.js';
import { ICON } from '../constants.js';
import { yellow, cyan, magenta, dim, green, blue, red } from '../utils/colors.js';
import { getProjectName } from '../utils/git.js';

/**
 * 프로젝트 라인 렌더링 (파랑/시안 테마)
 */
export function renderProjectLine(ctx: RenderContext): string | null {
  const showProject = ctx.config.display.showProject;
  const showGit = ctx.config.display.showGit;
  const showConfigCounts = ctx.config.display.showConfigCounts;

  if (!showProject && !showGit && !showConfigCounts) {
    return null;
  }

  const parts: string[] = [];

  // 프로젝트 경로 (시안 테마)
  if (showProject && ctx.stdin.cwd) {
    const projectName = getProjectName(ctx.stdin.cwd, 2);
    parts.push(`${cyan(ICON.project)} ${cyan(projectName)}`);
  }

  // Git 브랜치 (파랑 테마)
  if (showGit && ctx.gitBranch) {
    let gitPart = `${blue(ICON.git)} ${blue(ctx.gitBranch)}`;

    // dirty 표시
    if (ctx.gitDirty) {
      gitPart += red('*');
    }

    parts.push(gitPart);
  }

  return parts.length > 0 ? parts.join(' │ ') : null;
}

/**
 * 설정 카운트 라인 렌더링 (파랑/시안 테마)
 */
export function renderConfigCountsLine(ctx: RenderContext): string | null {
  if (!ctx.config.display.showConfigCounts) {
    return null;
  }

  const counts = ctx.configCounts;
  const countParts: string[] = [];

  // CLAUDE.md (시안, 있을 때만)
  if (counts.claudeMdCount > 0) {
    countParts.push(`${cyan(LABELS.claudeMd)} ${cyan(`${counts.claudeMdCount}`)}`);
  }

  // AGENTS.md (파랑, 있을 때만)
  if (counts.agentsMdCount > 0) {
    countParts.push(`${blue(LABELS.agentsMd)} ${blue('✓')}`);
  }

  // MCP (시안, 있을 때만)
  if (counts.mcpCount > 0) {
    countParts.push(`${cyan(LABELS.mcps)} ${cyan(`${counts.mcpCount}`)}`);
  }

  // Skills (파랑, 있을 때만)
  if (counts.skillsCount > 0) {
    countParts.push(`${blue(LABELS.skills)} ${blue(`${counts.skillsCount}`)}`);
  }

  // Rules (시안, 있을 때만)
  if (counts.rulesCount > 0) {
    countParts.push(`${cyan(LABELS.rules)} ${cyan(`${counts.rulesCount}`)}`);
  }

  // Hooks (파랑, 있을 때만)
  if (counts.hooksCount > 0) {
    countParts.push(`${blue(LABELS.hooks)} ${blue(`${counts.hooksCount}`)}`);
  }

  return countParts.length > 0 ? countParts.join(' │ ') : null;
}
