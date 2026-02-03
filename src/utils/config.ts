/**
 * 설정 관리 유틸리티
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Config } from '../types.js';
import { DEFAULT_CONFIG } from '../types.js';
import { CONFIG_FILE, CACHE_DIR } from '../constants.js';

/**
 * 설정 파일 경로
 */
export function getConfigPath(): string {
  return path.join(os.homedir(), CACHE_DIR, CONFIG_FILE);
}

/**
 * 설정 로드
 */
export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath();

  try {
    if (!fs.existsSync(configPath)) {
      return DEFAULT_CONFIG;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content) as Partial<Config>;

    return mergeConfig(userConfig);
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * 설정 저장
 */
export async function saveConfig(config: Partial<Config>): Promise<void> {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }

    const currentConfig = await loadConfig();
    const newConfig = mergeConfig({ ...currentConfig, ...config });

    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), {
      mode: 0o600,
    });
  } catch (error) {
    console.error('설정 저장 실패:', error);
  }
}

/**
 * 설정 병합
 */
function mergeConfig(userConfig: Partial<Config>): Config {
  return {
    plan: userConfig.plan ?? DEFAULT_CONFIG.plan,
    layout: userConfig.layout ?? DEFAULT_CONFIG.layout,
    display: {
      showContext: userConfig.display?.showContext ?? DEFAULT_CONFIG.display.showContext,
      showRateLimit: userConfig.display?.showRateLimit ?? DEFAULT_CONFIG.display.showRateLimit,
      showProject: userConfig.display?.showProject ?? DEFAULT_CONFIG.display.showProject,
      showGit: userConfig.display?.showGit ?? DEFAULT_CONFIG.display.showGit,
      showTools: userConfig.display?.showTools ?? DEFAULT_CONFIG.display.showTools,
      showAgents: userConfig.display?.showAgents ?? DEFAULT_CONFIG.display.showAgents,
      showTodos: userConfig.display?.showTodos ?? DEFAULT_CONFIG.display.showTodos,
      showConfigCounts: userConfig.display?.showConfigCounts ?? DEFAULT_CONFIG.display.showConfigCounts,
      showSessionDuration: userConfig.display?.showSessionDuration ?? DEFAULT_CONFIG.display.showSessionDuration,
    },
    cache: {
      ttlSeconds: userConfig.cache?.ttlSeconds ?? DEFAULT_CONFIG.cache.ttlSeconds,
    },
  };
}
