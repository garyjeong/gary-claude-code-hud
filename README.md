# gary-claude-code-hud

Claude Code용 한국어 실시간 상태 HUD (Head-Up Display) 플러그인

## 주요 기능

- **모델 정보**: 현재 사용 중인 AI 모델 및 컨텍스트 사용량
- **Rate Limit**: 5시간/7일 API 사용량 및 리셋 시간 (Max 플랜 소넷 포함)
- **프로젝트 정보**: 현재 디렉토리 및 Git 브랜치
- **설정 카운트**: CLAUDE.md, AGENTS.md, MCP, Skills 개수

## 표시 예시

```
모델 : Opus ●●●○○○○○○○ 35% 70K/200K 세션 : 1시간 23분
사용량 : 5시간 : ●●○○○ 32% (2시간 15분) │ 7일 : ●●●○○ 45% (5시간 30분)
└ 소넷 : ●○○○○ 12% (150시간 20분)
프로젝트 : workspace/my-project │ Git : main* │ CLAUDE.md : 1 │ AGENTS.md : ✓ │ MCPs : 3 │ Skills : 27
```

### 색상 테마

| 섹션 | 색상 | 항목 |
|------|------|------|
| 모델 | 녹색 | 모델명, 컨텍스트 진행바 |
| 사용량 | 노랑 | 5시간, 7일, 소넷 Rate Limit |
| 프로젝트 | 파랑/시안 | 프로젝트 경로, Git, 설정 카운트 |

## 설치

### 1. 저장소 클론 및 빌드

```bash
# 저장소 클론
git clone https://github.com/garyjeong/gary-claude-code-hud.git
cd gary-claude-code-hud

# 의존성 설치 및 빌드
npm install
npm run build
```

### 2. Claude Code 설정에 등록

`~/.claude/settings.json` 파일을 열고 `statusLine` 항목을 추가합니다:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/gary-claude-code-hud/dist/index.js"
  }
}
```

> `/path/to/gary-claude-code-hud`를 실제 설치 경로로 변경하세요.

### 3. Claude Code 재시작

설정 적용을 위해 Claude Code를 재시작합니다.

## 설정

### 설정 파일 위치

`~/.claude/gary-claude-code-hud.local.json`

### 기본 설정

```json
{
  "plan": "max200",
  "layout": "multiline",
  "display": {
    "showContext": true,
    "showRateLimit": true,
    "showProject": true,
    "showGit": true,
    "showTools": false,
    "showAgents": true,
    "showTodos": true,
    "showConfigCounts": true,
    "showSessionDuration": true
  },
  "cache": {
    "ttlSeconds": 60
  }
}
```

### 설정 옵션

| 옵션 | 설명 | 값 | 기본값 |
|------|------|-----|--------|
| `plan` | API 플랜 | `pro`, `max100`, `max200`, `team` | `max200` |
| `layout` | 레이아웃 | `multiline`, `compact` | `multiline` |
| `display.showContext` | 컨텍스트 사용량 표시 | `true/false` | `true` |
| `display.showRateLimit` | Rate Limit 표시 | `true/false` | `true` |
| `display.showProject` | 프로젝트 경로 표시 | `true/false` | `true` |
| `display.showGit` | Git 브랜치 표시 | `true/false` | `true` |
| `display.showTools` | 도구 상태 표시 | `true/false` | `false` |
| `display.showAgents` | 에이전트 상태 표시 | `true/false` | `true` |
| `display.showTodos` | Todo 진행률 표시 | `true/false` | `true` |
| `display.showConfigCounts` | 설정 파일 카운트 표시 | `true/false` | `true` |
| `display.showSessionDuration` | 세션 시간 표시 | `true/false` | `true` |
| `cache.ttlSeconds` | API 캐시 TTL (초) | 숫자 | `60` |

### 플랜별 표시 차이

| 플랜 | 5시간 | 7일 전체 | 7일 소넷 |
|------|-------|----------|----------|
| Pro | O | X | X |
| Max 100/200 | O | O | O |
| Team | O | X | X |

## Rate Limit API

Rate Limit 정보는 Anthropic OAuth API에서 가져옵니다.
macOS Keychain에 저장된 Claude 인증 정보를 사용합니다.

### 캐싱

API 호출 최소화를 위해 결과를 캐싱합니다:
- 캐시 위치: `~/.claude/gary-claude-code-hud-cache.json`
- 기본 TTL: 60초

## 요구사항

- Claude Code CLI
- Node.js 18 이상
- macOS (Keychain 접근 필요)

## 라이선스

MIT
