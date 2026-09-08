# gary-claude-code-hud

Claude Code용 한국어 실시간 상태 HUD (Head-Up Display) 플러그인

## 주요 기능

- **모델 정보**: 현재 사용 중인 AI 모델 및 컨텍스트 사용량
- **Rate Limit**: 5시간/7일 API 사용량
- **외부 CLI 사용량**: codex 한도·초기화 시각, grok 토큰·비용 (로컬 파일에서 읽음)
- **프로젝트 정보**: 현재 디렉토리 및 Git 브랜치
- **설정 카운트**: CLAUDE.md, AGENTS.md, MCPs, Skills 개수 (있는 항목만 표시)

## 표시 예시

```
모델 : Opus 35% 70K/200K │ 사용량 : 62%(5시간·2시간 15분) / 50%(7일)
외부 : codex 69% 62.6M(7일·08-05 13시) │ grok 23.4M $14.9(주간·08-04 14시)
프로젝트 : workspace/my-project │ Git : main* │ CLAUDE.md : 1 │ AGENTS.md : ✓ │ MCPs : 3 │ Skills : 27
```

### 색상 테마

| 섹션 | 색상 | 항목 |
|------|------|------|
| 모델 | 녹색 | 모델명, 컨텍스트 |
| 사용량 | 노랑 | 5시간, 7일 Rate Limit |
| 외부 | 마젠타 | codex, grok 사용량 |
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
  "grokWeekAnchor": "2026-08-04T14:19:00",
  "grokWeekCostLimitUsd": 259,
  "display": {
    "showContext": true,
    "showRateLimit": true,
    "showProject": true,
    "showGit": true,
    "showTools": false,
    "showAgents": true,
    "showTodos": true,
    "showConfigCounts": true,
    "showExternalUsage": true
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
| `grokWeekAnchor` | grok 주간 한도 초기화 기준시각 (로컬 ISO) | `2026-08-04T14:19:00` | 위 값 |
| `grokWeekCostLimitUsd` | grok 주간 한도(USD). 창 누적 비용을 나눠 %를 만든다. `0`이면 % 생략 | 숫자 | `259` |
| `display.showContext` | 컨텍스트 사용량 표시 | `true/false` | `true` |
| `display.showRateLimit` | Rate Limit 표시 | `true/false` | `true` |
| `display.showProject` | 프로젝트 경로 표시 | `true/false` | `true` |
| `display.showGit` | Git 브랜치 표시 | `true/false` | `true` |
| `display.showTools` | 도구 상태 표시 | `true/false` | `false` |
| `display.showAgents` | 에이전트 상태 표시 | `true/false` | `true` |
| `display.showTodos` | Todo 진행률 표시 | `true/false` | `true` |
| `display.showConfigCounts` | 설정 파일 카운트 표시 | `true/false` | `true` |
| `display.showExternalUsage` | codex·grok 사용량 표시 | `true/false` | `true` |
| `cache.ttlSeconds` | API 캐시 TTL (초) | 숫자 | `60` |

### 플랜별 표시 차이

| 플랜 | 5시간 | 7일 전체 |
|------|-------|----------|
| Pro | O | X |
| Max 100/200 | O | O |
| Team | O | X |

## Rate Limit API

Rate Limit 정보는 Anthropic OAuth API에서 가져옵니다.
macOS Keychain에 저장된 Claude 인증 정보를 사용합니다.

### 캐싱

API 호출 최소화를 위해 결과를 캐싱합니다:
- 캐시 위치: `~/.claude/gary-claude-code-hud-cache.json`
- 기본 TTL: 60초

## 외부 CLI 사용량 (codex / grok)

두 CLI 모두 사용량 조회 서브커맨드를 제공하지 않으므로, 로컬 세션 파일을 직접 읽습니다.
네트워크 호출은 없습니다.

두 소스의 **범위와 창을 맞췄습니다** — 둘 다 *계정 전역*(모든 프로젝트)이고 *주간 창*
기준입니다. 그래야 한 줄에 나란히 놓고 비교할 수 있습니다.

| | 데이터 소스 | 표시 항목 |
|---|---|---|
| codex | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` | 한도 %, 창 누적 토큰, 윈도우, 초기화 시각 |
| grok | `~/.grok/sessions/<URL인코딩 cwd>/<session>/updates.jsonl` (모든 cwd) | 한도 %(설정 한도로 나눈 근사), 창 누적 토큰, 비용(USD), 초기화 시각 |

- **codex**: 서버가 턴마다 내려주는 `rate_limits` 스냅샷 중 가장 최신 값을 씁니다.
  최신 파일 하나만 보면 스냅샷 없이 끝난 짧은 실행 때문에 표시가 사라지므로,
  최신순으로 최대 10개까지 훑습니다. 한도는 계정 상태라 이전 파일 값도 유효합니다.
  토큰은 `window_minutes`/`resets_at`이 정해주는 한도 창 안에서 **시작한** 세션들의
  누적을 더합니다(창을 걸친 세션은 이전 창이 섞이므로 제외하고 `+`로 표시).
- **Rate Limit**: 5시간 한도는 초기화까지 **남은 시간**(짧은 창이라 읽기 쉬움),
  7일·주간처럼 긴 창은 **절대 시각**으로 표시합니다.
- **grok**: CLI 경로로는 **주간 한도 %를 얻을 수 없습니다.** grok.com 웹앱의 설정 → 사용량에는
  주간 한도(예: `3% 사용, 8월 4일 초기화`)가 표시되지만, 그 값은 웹앱이 자체 API로 가져오는
  것입니다. 확인한 사실 — 로컬 세션 파일에는 한도 필드가 없고, `/usage` 슬래시 커맨드는
  TUI 전용이며(headless `-p`는 이를 일반 프롬프트로 취급), CLI OIDC 액세스 토큰으로
  `cli-chat-proxy.grok.com` · `api.x.ai`의 사용량/구독 경로를 조회하면 모두 404입니다
  (토큰 자체는 유효 — 401이 아님).
- **grok 한도 %는 근사값입니다.** 한도를 얻을 수 없으므로 `grokWeekCostLimitUsd`를 분모로
  두고 창 누적 비용을 나눠 계산합니다. 기본값 `259`는 2026-09-08 관측 한 쌍
  (창 누적 `$2.59` ↔ grok.com 표시 `1%`)에서 역산한 값입니다.
  ★**화면 %가 반올림이라 정밀하지 않습니다** — `1%`는 실제 0.5~1.49%이고 그만큼 한도는
  $173~$518 범위입니다. 표시된 %가 커진 시점(10% 이상)에 다시 역산하면 오차가 그 비율만큼
  줄어듭니다. 비용을 분모로 쓰는 이유는 grok 한도가 크레딧(금액) 개념이고 `costUsdTicks`는
  서버가 계산해 내려준 값이라 모델별 가중치가 이미 반영돼 있기 때문입니다(토큰 합계는 아님).
  `0`으로 두면 근거 없는 %를 지어내지 않고 토큰·비용만 표시합니다.
- **grok 주간 창**: %를 못 가져오는 대신, 집계 창을 웹앱의 주간 한도 창과 맞춥니다.
  `grokWeekAnchor`(초기화 시각)를 앵커로 7일 주기를 되돌려 현재 창을 구하고, 그 창 안의
  **증분**만 합산합니다. `usage`는 세션 전체 누적이므로 창을 걸친 세션은 창 직전 값을
  기준선으로 빼야 이전 주가 섞이지 않습니다(세션 시작 시각은 파일 앞 8KB로 판정).
  비용은 `costUsdTicks / 1e10 = USD`로 환산합니다. 세션이 상한(120개)을 넘으면
  합계 뒤에 `+`를 붙여 과소 집계임을 표시합니다.

  > **앵커는 계정마다 다릅니다.** grok.com → 설정 → 사용량에 표시된 초기화 시각을
  > `grokWeekAnchor`에 넣으세요. 주기만 맞으면 과거·미래 어느 시점을 넣어도 됩니다.
  > 값이 비었거나 형식이 틀리면 **최근 7일 롤링 창**으로 폴백하고, 라벨을 `주간`이
  > 아니라 `7일`로 표시해 정렬된 창이 아님을 드러냅니다. 기본값은 작성자 계정 기준이라
  > 다른 계정에서는 반드시 자기 값으로 바꿔야 웹 화면과 구간이 맞습니다.
- **캐시**: 계정 전역·주간 집계는 세션 파일 수백 개를 훑습니다(실측 codex 102개,
  grok 91개). 상태줄은 매 갱신마다 실행되므로 결과를 `cache.ttlSeconds` 동안
  `~/.claude/gary-claude-code-hud-external-cache.json`에 캐시합니다.
  실측 렌더 시간은 캐시 미스 0.09초, 적중 0.04초입니다.
- 해당 CLI를 쓰지 않거나 파일을 못 읽으면 그 항목만 조용히 생략됩니다(두 리더는
  각각 독립적으로 실패를 흡수해, 한쪽 실패가 다른 쪽 표시를 지우지 않습니다).

## 요구사항

- Claude Code CLI
- Node.js 18 이상
- macOS (Keychain 접근 필요)

## 라이선스

MIT
