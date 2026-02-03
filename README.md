# gary-claude-code-hud

Claude Code용 실시간 상태 HUD (Head-Up Display) 플러그인

## 주요 기능

- 🤖 **모델 정보**: 현재 사용 중인 AI 모델 표시
- 📊 **컨텍스트 사용량**: 토큰 사용량 시각화 (도트 진행바)
- ⏱️ **Rate Limit**: 5시간/7일 API 사용량 및 리셋 시간
- 📁 **프로젝트 정보**: 현재 디렉토리 및 Git 브랜치
- 🔧 **도구 상태**: 실행 중인 도구 및 완료 현황
- 🤝 **에이전트 상태**: 서브 에이전트 실행 상태
- ✅ **Todo 진행률**: 작업 완료 현황

## 설치

### 마켓플레이스에서 설치 (권장)

```bash
/plugin marketplace add gary/gary-claude-code-hud
/plugin install gary-claude-code-hud
```

### 수동 설치

```bash
# 저장소 클론
git clone https://github.com/gary/gary-claude-code-hud.git
cd gary-claude-code-hud

# 의존성 설치 및 빌드
npm install
npm run build

# 플러그인 등록
/plugin add /path/to/gary-claude-code-hud
```

## 설정

설정 명령어 실행:

```bash
/gary-claude-code-hud:setup
```

### 설정 파일

설정은 `~/.claude/gary-claude-code-hud.local.json`에 저장됩니다.

```json
{
  "plan": "max200",
  "layout": "multiline",
  "display": {
    "showContext": true,
    "showRateLimit": true,
    "showProject": true,
    "showGit": true,
    "showTools": true,
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

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `plan` | API 플랜 (pro/max100/max200/team) | `max200` |
| `layout` | 레이아웃 (multiline/compact) | `multiline` |
| `display.showContext` | 컨텍스트 사용량 표시 | `true` |
| `display.showRateLimit` | Rate Limit 표시 | `true` |
| `display.showProject` | 프로젝트 경로 표시 | `true` |
| `display.showGit` | Git 브랜치 표시 | `true` |
| `display.showTools` | 도구 상태 표시 | `true` |
| `display.showAgents` | 에이전트 상태 표시 | `true` |
| `display.showTodos` | Todo 진행률 표시 | `true` |
| `display.showConfigCounts` | 설정 파일 카운트 표시 | `true` |
| `display.showSessionDuration` | 세션 시간 표시 | `true` |
| `cache.ttlSeconds` | API 캐시 TTL (초) | `60` |

## 표시 예시

### 멀티라인 레이아웃

```
🤖 Opus ●●●●●●○○○○ 65% 130K/200K ⏰ 1시간 23분
⏱️ 5시간: ●●●○○ 32% (2시간 15분) │ 7일: 전체 45% | 소넷 28%
📁 my-project │ 🌿 git:(main*) │ 2 CLAUDE.md | 3 MCP
🔧 ◐ Read src/index.ts (3초) │ (실행중: 1, 완료: 15)
✅ 3/5 (60%) ◐ API 엔드포인트 구현 ●●●○○
```

### 컴팩트 레이아웃

```
🤖 Opus ●●●●●●○○○○ 65% │ ⏱️ 5시간: 32% │ 📁 my-project 🌿 main*
🔧 ◐ Read (3초) │ ✅ 3/5 (60%)
```

## 요구사항

- Claude Code v1.0.80 이상
- Node.js 18 이상 또는 Bun

## 라이선스

MIT
