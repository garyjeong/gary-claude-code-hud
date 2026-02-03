/**
 * 설정 파일 카운트 유틸리티
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { ConfigCounts } from '../types.js';

/**
 * CLAUDE.md, AGENTS.md, rules, MCPs, hooks, skills 파일 개수 카운트
 */
export async function countConfigs(cwd?: string): Promise<ConfigCounts> {
  const result: ConfigCounts = {
    claudeMdCount: 0,
    agentsMdCount: 0,
    rulesCount: 0,
    mcpCount: 0,
    hooksCount: 0,
    skillsCount: 0,
  };

  const homeDir = os.homedir();
  const globalClaudeDir = path.join(homeDir, '.claude');

  // 1. CLAUDE.md 카운트
  result.claudeMdCount = countClaudeMdFiles(cwd, homeDir);

  // 2. AGENTS.md 카운트
  result.agentsMdCount = countAgentsMdFiles(cwd, homeDir);

  // 3. rules 카운트 (global + local)
  result.rulesCount = countRulesFiles(globalClaudeDir, cwd);

  // 4. MCPs 카운트
  result.mcpCount = countMcpServers(globalClaudeDir, cwd);

  // 5. hooks 카운트
  result.hooksCount = countHooks(globalClaudeDir, cwd);

  // 6. skills 카운트
  result.skillsCount = countSkills(globalClaudeDir, cwd);

  return result;
}

/**
 * CLAUDE.md 파일 카운트
 */
function countClaudeMdFiles(cwd?: string, homeDir?: string): number {
  let count = 0;
  const checked = new Set<string>();

  // 글로벌 CLAUDE.md
  if (homeDir) {
    const globalPath = path.join(homeDir, 'CLAUDE.md');
    if (fs.existsSync(globalPath)) {
      count++;
      checked.add(globalPath);
    }
  }

  // 프로젝트 CLAUDE.md
  if (cwd) {
    const projectPath = path.join(cwd, 'CLAUDE.md');
    if (!checked.has(projectPath) && fs.existsSync(projectPath)) {
      count++;
    }

    // CLAUDE.local.md도 확인
    const localPath = path.join(cwd, 'CLAUDE.local.md');
    if (fs.existsSync(localPath)) {
      count++;
    }
  }

  return count;
}

/**
 * AGENTS.md 파일 카운트
 */
function countAgentsMdFiles(cwd?: string, homeDir?: string): number {
  let count = 0;
  const checked = new Set<string>();

  // 글로벌 AGENTS.md
  if (homeDir) {
    const globalPath = path.join(homeDir, 'AGENTS.md');
    if (fs.existsSync(globalPath)) {
      count++;
      checked.add(globalPath);
    }
  }

  // 프로젝트 AGENTS.md
  if (cwd) {
    const projectPath = path.join(cwd, 'AGENTS.md');
    if (!checked.has(projectPath) && fs.existsSync(projectPath)) {
      count++;
    }

    // AGENTS.local.md도 확인
    const localPath = path.join(cwd, 'AGENTS.local.md');
    if (fs.existsSync(localPath)) {
      count++;
    }
  }

  return count;
}

/**
 * rules 파일 카운트
 */
function countRulesFiles(globalClaudeDir: string, cwd?: string): number {
  let count = 0;

  // 글로벌 rules
  const globalRulesDir = path.join(globalClaudeDir, 'rules');
  count += countFilesInDir(globalRulesDir);

  // 프로젝트 rules
  if (cwd) {
    const localRulesDir = path.join(cwd, '.claude', 'rules');
    count += countFilesInDir(localRulesDir);
  }

  return count;
}

/**
 * MCP 서버 카운트
 */
function countMcpServers(globalClaudeDir: string, cwd?: string): number {
  let count = 0;

  // 글로벌 settings.json에서 MCP 서버 카운트
  const globalSettings = path.join(globalClaudeDir, 'settings.json');
  count += countMcpFromSettings(globalSettings);

  // 프로젝트 settings.local.json
  if (cwd) {
    const localSettings = path.join(cwd, '.claude', 'settings.local.json');
    count += countMcpFromSettings(localSettings);
  }

  return count;
}

/**
 * settings 파일에서 MCP 서버 카운트
 */
function countMcpFromSettings(settingsPath: string): number {
  try {
    if (!fs.existsSync(settingsPath)) return 0;

    const content = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);

    const mcpServers = settings.mcpServers ?? settings.mcp_servers ?? {};
    return Object.keys(mcpServers).length;
  } catch {
    return 0;
  }
}

/**
 * hooks 카운트
 */
function countHooks(globalClaudeDir: string, cwd?: string): number {
  let count = 0;

  // 글로벌 hooks
  const globalSettings = path.join(globalClaudeDir, 'settings.json');
  count += countHooksFromSettings(globalSettings);

  // 프로젝트 hooks
  if (cwd) {
    const localSettings = path.join(cwd, '.claude', 'settings.local.json');
    count += countHooksFromSettings(localSettings);
  }

  return count;
}

/**
 * settings 파일에서 hooks 카운트
 */
function countHooksFromSettings(settingsPath: string): number {
  try {
    if (!fs.existsSync(settingsPath)) return 0;

    const content = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);

    const hooks = settings.hooks ?? {};
    let count = 0;

    for (const hookType of Object.values(hooks)) {
      if (Array.isArray(hookType)) {
        count += hookType.length;
      }
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * Skills 카운트
 * ~/.claude/skills/ 디렉토리와 프로젝트 .claude/skills/ 디렉토리 내 스킬 카운트
 */
function countSkills(globalClaudeDir: string, cwd?: string): number {
  let count = 0;

  // 글로벌 skills
  const globalSkillsDir = path.join(globalClaudeDir, 'skills');
  count += countSkillsInDir(globalSkillsDir);

  // 프로젝트 skills
  if (cwd) {
    const localSkillsDir = path.join(cwd, '.claude', 'skills');
    count += countSkillsInDir(localSkillsDir);
  }

  return count;
}

/**
 * 스킬 디렉토리에서 스킬 개수 카운트
 * 각 서브디렉토리가 하나의 스킬
 */
function countSkillsInDir(skillsDir: string): number {
  try {
    if (!fs.existsSync(skillsDir)) return 0;

    const entries = fs.readdirSync(skillsDir);
    let count = 0;

    for (const entry of entries) {
      const fullPath = path.join(skillsDir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // 디렉토리 안에 skill.md 또는 다른 스킬 파일이 있는지 확인
        const skillFiles = ['skill.md', 'index.md', 'README.md'];
        const hasSkillFile = skillFiles.some((f) =>
          fs.existsSync(path.join(fullPath, f))
        );
        if (hasSkillFile) {
          count++;
        }
      } else if (stat.isFile() && entry.endsWith('.md')) {
        // 단일 .md 파일도 스킬로 카운트
        count++;
      }
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * 디렉토리 내 파일 개수 카운트
 */
function countFilesInDir(dirPath: string): number {
  try {
    if (!fs.existsSync(dirPath)) return 0;

    const entries = fs.readdirSync(dirPath);
    return entries.filter((entry) => {
      const fullPath = path.join(dirPath, entry);
      return fs.statSync(fullPath).isFile();
    }).length;
  } catch {
    return 0;
  }
}
