# HUD 설정 구성

gary-claude-code-hud 설정을 구성합니다.

## 설정 항목

사용자에게 다음 설정을 차례로 물어보세요:

### 1. API 플랜 선택
- **Pro** ($20/월): 5시간 윈도우만 적용
- **Max $100** ($100/월): 5시간 + 7일 윈도우 (Opus 제한)
- **Max $200** ($200/월): 5시간 + 7일 윈도우 (더 높은 한도)
- **Team**: 조직용 플랜

### 2. 레이아웃 선택
- **multiline**: 정보별로 줄을 나누어 가독성 좋게
- **compact**: 모든 정보를 압축하여 표시

### 3. 표시 항목 선택 (복수 선택 가능)
- 컨텍스트 사용량 (showContext)
- Rate Limit (showRateLimit)
- 프로젝트 경로 (showProject)
- Git 브랜치 (showGit)
- 도구 상태 (showTools)
- 에이전트 상태 (showAgents)
- Todo 진행률 (showTodos)
- 설정 파일 카운트 (showConfigCounts)
- 세션 시간 (showSessionDuration)

## 설정 저장

설정은 `~/.claude/gary-claude-code-hud.local.json` 파일에 저장됩니다.

### 설정 파일 예시

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

## 설정 후

설정을 저장한 후, Claude Code를 재시작하면 새 설정이 적용됩니다.

---

사용자가 `/gary-claude-code-hud:setup`을 실행하면:

1. 현재 설정을 읽어서 보여주고
2. 변경하고 싶은 항목을 물어보고
3. 새 설정을 `~/.claude/gary-claude-code-hud.local.json`에 저장하세요

설정 저장 시 Write 도구를 사용하세요.
