# AutoFlow 🤖✨

**AI 기반 업무 자동화 시스템 — 모듈형 Clean Architecture**

> **포트폴리오 프로젝트**
>
> SOLID 원칙 + DI Container + Clean Architecture 기반의 확장 가능한 AI 자동화 솔루션
>
> 🔧 **듀얼 모듈 시스템:** `Commerce` (이커머스) / `Office` (사무자동화)

---

## 🎯 개요

AutoFlow는 반복적인 업무를 AI로 자동화하는 확장형 모듈 시스템입니다.

### 📦 Commerce Module (이커머스)
- **AI 상품 콘텐츠 생성**: 원시 데이터 → AI가 상품명/설명/키워드/SEO 자동 생성
- **마케팅 성과 리포트**: Meta/Naver/Cafe24/GA4 데이터 취합 → AI 요약 리포트
- **업무 자동화 파이프라인**: 여러 태스크를 조합한 파이프라인 실행
- **외부 데이터 동기화**: 플랫폼 간 데이터 정합성 관리

### 📦 Office Module (사무자동화)
- **AI 문서 요약**: 회의록/보고서/기획서 → 핵심 포인트 + 액션 아이템 추출
- **업무 리포트 생성**: 주간/월간 KPI 데이터 → 구조화된 리포트 + 인사이트
- **데이터 일괄 입력**: CSV/JSON 데이터 검증 및 자동 포맷팅

### 🏗️ Architecture

```
Domain (순수 비즈니스 모델) ← Ports(인터페이스) ← Use Cases ← Infrastructure → DI Container → CLI
```

| 계층 | 역할 | 의존성 |
|------|------|-------|
| **Domain** | `Task`, `Pipeline`, `ProductData`, `MarketingMetrics` | ❌ 외부 의존성 없음 (Pure TS) |
| **Ports** | `IAiService`, `IExternalApiClient`, `IRepository`, `ILogger` | 인터페이스만 정의 |
| **Application** | `CreateProductDescription`, `GenerateMarketingReport` 등 유스케이스 | Ports에만 의존 |
| **Infrastructure** | `ClaudeApiClient`, `MockCafe24Client`, `JsonFileRepository` | Ports 구현 |
| **DI Container** | Composition Root | 모든 구현체를 조립 |

---

## 🔑 SOLID 원칙 적용

| 원칙 | 적용 내용 |
|------|---------|
| **S** 단일 책임 | `ClaudeApiClient` = API 호출만 / `JsonFileTaskRepository` = 파일 I/O만 / 각 UseCase = 단일 비즈니스 로직 |
| **O** 개방-폐쇄 | 새 플랫폼 추가 = `IExternalApiClient` 구현체 1개 + DI Container 1줄 등록, 기존 코드 수정 0 |
| **L** 리스코프 치환 | 모든 `IExternalApiClient` 구현체는 동일 계약 준수 (`fetchProducts`, `fetchMarketingMetrics`) |
| **I** 인터페이스 분리 | `IAiService`, `IExternalApiClient`, `INotificationService`, `IRepository`로 작게 분리 |
| **D** 의존성 역전 | 유스케이스는 구체 클래스 대신 인터페이스에만 의존. DI Container가 `new`로 조립 |

```

             ┌─ IAiService ←──── ClaudeApiClient (or Mock fallback)
  Use Case ──┼─ IExternalApiClient ←─ MockCafe24Client / RealCafe24Client
             └─ ITaskRepository ←─── JsonFileTaskRepository

  DI Container (Composition Root) = new UseCase(impl1, impl2, ...)
```

---

## ⚙️ 기술 스택

| 기술 | 용도 |
|------|------|
| **TypeScript 5** + Node.js 22 | ESM, 타입 안정성 |
| **tsyringe** | DI Container (→ 수동 DI로 대체, 데코레이터 문제 회피) |
| **Commander** | CLI 인터페이스 |
| **Vitest** (예정) | TDD 단위 테스트 |
| **Anthropic Claude API** | AI 콘텐츠 생성 (API 키 없으면 Mock 모드 자동 전환) |

---

## 🔧 실행 방법

```bash
# 1) 클론
git clone https://github.com/kongnamul-muchim/autoflow.git
cd autoflow

# 2) 의존성 설치
npm install

# 3) 개발 모드 실행 (CLI, Mock 모드라 API 키 없이 바로 동작)
npm run dev
```

> `npm run dev`는 `tsx src/main.ts`(CLI)를 실행합니다. 어떤 명령을 쓸 수 있는지는 `npm run dev -- --help`로 확인하세요.
> 웹 데모 UI를 열려면 `npm run serve` → 브라우저에서 `http://localhost:4002`.

---

## 🚀 Quick Start

### 설치

```bash
git clone https://github.com/kongnamul-muchim/autoflow.git
cd autoflow
npm install
```

### 사용법 (Mock 모드 — API 키 없이 바로 실행 가능)

```bash
# AI 상품 설명 생성
npx tsx src/main.ts describe \
  -n "글로우 립스틱" \
  -c "립메이크업" \
  -d "촉촉한 글로우 발색 립스틱" \
  -k "립스틱,글로우,발색"

# 일일 마케팅 리포트 생성
npx tsx src/main.ts report:daily

# 데이터 동기화
npx tsx src/main.ts sync -s cafe24 -t meta

# 자동화 파이프라인 실행
npx tsx src/main.ts pipeline:run -n daily-report -s 3

# 저장된 태스크/파이프라인 조회
npx tsx src/main.ts list
```

### 실제 Claude API 사용

```bash
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY 입력 후:
npx tsx src/main.ts describe -n "글로우 립스틱" -c "립메이크업"
```

---

## 📁 Project Structure

```
portfolio-autoflow/
├── ARCHITECTURE.md        # 상세 아키텍처 설계 문서
├── README.md
├── package.json / tsconfig.json / vitest.config.ts
├── .env.example
│
├── src/
│   ├── main.ts                               # Entry Point (Commander CLI)
│   ├── domain/                               # 순수 비즈니스 모델
│   │   ├── entities/     Task, Pipeline, TaskResult
│   │   ├── valueObjects/ ProductData, MarketingMetrics, Report, Types
│   │   └── ports/        IAiService, IExternalApiClient, IRepository, ILogger, IConfigService, INotificationService
│   ├── application/                           # 유스케이스
│   │   ├── usecases/     CreateProductDescription, GenerateMarketingReport, SyncExternalData, RunAutomationPipeline
│   │   └── dto/          CreateProductRequest, PipelineRequest, ReportRequest
│   ├── infrastructure/                        # 구현체
│   │   ├── ai/           ClaudeApiClient (→ Mock fallback)
│   │   ├── api/          MockCafe24Client, MockMetaClient, MockNaverClient
│   │   ├── repository/   JsonFileTaskRepository, JsonFilePipelineRepository
│   │   ├── logger/       ConsoleLogger
│   │   ├── config/       EnvironmentConfig
│   │   └── notification/ ConsoleNotificationService
│   ├── di/               container.ts (Composition Root)
│   └── presentation/     CliController
│       └── cli/
└── data/                 # 실행 데이터 저장
```

---

## 🧪 테스트 실행

```bash
# 전체 테스트 (추가 예정)
npm test

# Watch 모드
npm run test:watch

# 커버리지
npm run test:coverage
```

---

## 📋 명령어 레퍼런스

| 명령어 | 설명 | 옵션 |
|--------|------|------|
| `describe` | AI 상품 설명 생성 | `-n, --name` (필수), `-c, --category` (필수), `-d, --description`, `-k, --keywords` |
| `report:daily` | 일일 마케팅 리포트 | `-p, --platforms` (기본: cafe24,meta,naver) |
| `sync` | 데이터 동기화 | `-s, --source` (필수), `-t, --target` (필수) |
| `pipeline:run` | 파이프라인 실행 | `-n, --name` (필수), `-s, --steps` (기본: 1) |
| `list` | 저장 데이터 조회 | `-t, --type` (tasks \| pipelines) |

---

## 📊 Demo 출력 예시

**AI 상품 설명 생성:**
```
✅ 상품 설명 생성 완료: 글로우 립스틱

📦 **상품 설명 생성 완료**
━━━━━━━━━━━━━━━━━━━━━
🏷️  제목: 글로우 립스틱
📝 설명: 선명한 발색과 촉촉한 글로우 마무리감이 매력적인 립스틱입니다...
🔑 키워드: 립스틱, 글로우, 발색력, 지속력, 보습
💰 USP: 24시간 지속되는 발색 | 촉촉한 글로우 마무리 | 자연유래 성분 함유
━━━━━━━━━━━━━━━━━━━━━
```

**마케팅 리포트:**
```
✅ 마케팅 리포트 생성 완료

📊 **마케팅 리포트**
━━━━━━━━━━━━━━━━━━━━━
📋 마케팅 성과 리포트 (2026. 6. 17. ~ 2026. 6. 18.)
📈 요약: 전체 광고 성과는 안정적인 수준을 유지하고 있습니다...
💰 총 매출: ₩44,400,000
💸 총 비용: ₩12,800,000
📊 ROAS: 3.47
━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 프로젝트 성과 & 배운 것

> 면접에서 "이걸로 뭘 만들었고, 뭘 배웠는지"를 말할 때 쓰는 핵심 기록.

**만든 것 (무엇)**
- AI 상품 콘텐츠 생성 + 마케팅 리포트 + 데이터 동기화까지를 **하나의 모듈형 엔진**으로 통합한 CLI 시스템
- Commerce / Office 두 도메인을 같은 아키텍처에서 동작하도록 설계 → 확장형 구조

**배운 것 (어떻게 / 무엇을)**
1. **Clean Architecture 계층 분리** — Domain(순수 TS) / Ports(인터페이스) / Application(유스케이스) / Infrastructure(구현체)를 나누니 **테스트 가능성과 확장성**이 크게 올라감.
2. **수동 DI Container 구축** — 처음엔 `tsyringe`를 썼는데 데코레이터/Target 문제가 생겨 **직접 수동 DI로 교체**. 의존성 조립이 Composition Root 한 곳에 모이는 설계를 체감.
3. **OCP(개방-폐쇄) 확장 설계** — 새 플랫폼(Cafe24/Meta/Naver)을 추가할 때 기존 코드 수정 없이 `IExternalApiClient` 구현체 1개 + DI 1줄만으로 끝나는 것을 경험.
4. **Mock fallback 전략** — 실제 API 키 없이도 즉시 데모가 돌도록 Mock 구현체를 배치. "키 없이 실행 가능"이 데모·채용 과정에서 큰 장점.
5. **포트/어댑터 패턴** — 외부 시스템을 인터페이스로 추상화 → 실제 연동 전에 로직을 먼저 검증하는 흐름.

---

## 🗺️ Roadmap

- [ ] Vitest TDD 단위 테스트 추가
- [ ] 실제 Cafe24/Meta/Naver API 연동
- [ ] 웹 대시보드 (Next.js)
- [ ] 슬랙 알림 연동
- [ ] CI/CD (GitHub Actions)

---

## 🔌 AI 연결 방식 (키 주입식)

AI 호출은 `src/infrastructure/ai/ClaudeApiClient.ts` 한 곳에 모여 있고, 키와 프로바이더는 코드가 아니라
**환경변수**로 들어간다. 코드는 그대로 두고 환경변수만 바꾸면 다른 모델로 갈아탄다.

변수는 **4개로 고정**이다. 프로바이더마다 키 이름을 따로 외우지 않는다.

| 변수 | 역할 |
|---|---|
| `AI_PROVIDER` | `gemini` · `deepseek` · `anthropic` · `openai` · `openrouter` · `groq` · `ollama` |
| `AI_API_KEY` | 그 제공자의 키 |
| `AI_MODEL` | 비우면 프리셋 기본 모델 |
| `AI_BASE_URL` | 게이트웨이/프록시를 쓸 때만 (비우면 프리셋 주소) |

프리셋 표는 `src/infrastructure/ai/providerPresets.ts` 한 곳에 있고, base 주소·기본 모델·프로토콜
(`/v1/messages` vs OpenAI 호환 `/chat/completions`)이 여기서 결정된다. OpenAI 호환은 base 에 버전이
이미 있으면(`/v1`, `/v1beta/openai`) 그대로 쓰고 없으면 `/v1` 을 붙인다.

```bash
cp .env.example .env
# .env → AI_PROVIDER=gemini, AI_API_KEY=...
AUTOFLOW_MODULE=commerce AUTOFLOW_PORT=4002 npm run serve
```

### 선언과 실제가 어긋나면 알려준다

프로바이더별 변수명을 따로 두면 "선언은 deepseek 인데 주소는 Gemini" 같은 상태를 아무도 모른다.
그래서 `AI_PROVIDER` 와 base 호스트를 대조해 어긋나면 **기동 로그·`/api/health`·화면** 세 곳에 경고를 남긴다.

```bash
# 실제로 4개월간 이 상태였다
AI_PROVIDER=deepseek DEEPSEEK_API_BASE=https://generativelanguage.googleapis.com/v1beta/openai/
# → ⚠️ AI_PROVIDER=deepseek 인데 base host 가 generativelanguage.googleapis.com 입니다 (이 주소는 gemini 것 같습니다)
```

예전 변수명(`ANTHROPIC_API_KEY`, `DEEPSEEK_API_KEY` …)도 계속 읽는다. 새 이름이 있으면 새 이름이 이긴다.

현재 모드와 프로바이더는 서버가 직접 알려준다. 화면 문구를 손으로 바꿀 필요가 없다.

```bash
curl -s localhost:4002/api/health
# 키 없음        : {"aiMode":"sample","aiProvider":"anthropic","aiModel":"claude-sonnet-4-20250514","aiBaseHost":"api.anthropic.com"}
# 키 있고 정상    : {"aiMode":"live","aiProvider":"gemini","aiModel":"gemini-2.5-flash","aiBaseHost":"generativelanguage.googleapis.com"}
# 키 있는데 실패  : {"aiMode":"degraded", ...}
# 설정이 어긋남   : {"aiWarning":"AI_PROVIDER=deepseek 인데 base host 가 ..."}
```

`sample` 은 키가 없다는 뜻이고, `degraded` 는 키는 있는데 마지막 호출이 실패해 예시로 떨어졌다는 뜻이다.
키가 있다고 무조건 `live` 라고 말하지 않는다.

### 응답 파싱

실제 모델은 JSON 만 달랑 주지 않는다. ` ```json ` 펜스로 감싸거나 앞뒤에 설명을 붙인다.
`src/core/application/support/jsonResponse.ts` 가 펜스 제거 → 원문 → 첫 `{`~마지막 `}` 순으로 시도하고,
배열이 문자열로 올 때도 받아준다. 이 경로가 없으면 제목이 `자동 생성 상품` 으로 떨어지고 키워드가 비는데,
mock 응답은 항상 깨끗한 JSON 이라 **mock 만 쓰면 이 결함이 보이지 않는다.**

### 키 없이 검증하기

`tests/stub_anthropic.py` 는 Anthropic·OpenAI 두 형식을 모두 흉내내고, OpenAI 쪽은 일부러 코드 펜스로 감싸 보낸다.

```bash
python3 tests/stub_anthropic.py &                      # 127.0.0.1:4999
AI_PROVIDER=deepseek DEEPSEEK_API_KEY=stub \
DEEPSEEK_API_BASE=http://127.0.0.1:4999/v1 DEEPSEEK_MODEL=stub \
AUTOFLOW_MODULE=commerce AUTOFLOW_PORT=4002 npm run serve
```

모듈은 같은 코드로 두 개를 띄운다.

```bash
AUTOFLOW_MODULE=commerce AUTOFLOW_PORT=4002 npm run serve
AUTOFLOW_MODULE=office   AUTOFLOW_PORT=4003 npm run serve
```
