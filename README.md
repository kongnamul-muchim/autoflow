# AutoFlow 🤖✨

**AI 기반 이커머스 업무 자동화 시스템**

> **(주)글로비언트 AX팀 개발자 포트폴리오**
>
> SOLID 원칙 + DI Container + Clean Architecture 기반의 확장 가능한 AI 자동화 솔루션

---

## 🎯 개요

AutoFlow는 이커머스 회사의 반복적인 업무를 AI로 자동화하는 에이전트 시스템입니다.

- **AI 상품 콘텐츠 생성**: 원시 데이터 → AI가 상품명/설명/키워드/SEO 자동 생성
- **마케팅 성과 리포트**: Meta/Naver/Cafe24/GA4 데이터 취합 → AI 요약 리포트
- **업무 자동화 파이프라인**: 여러 태스크를 조합한 파이프라인 실행
- **외부 데이터 동기화**: 플랫폼 간 데이터 정합성 관리

---

## 🏗️ Architecture

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

## 🗺️ Roadmap

- [ ] Vitest TDD 단위 테스트 추가
- [ ] 실제 Cafe24/Meta/Naver API 연동
- [ ] 웹 대시보드 (Next.js)
- [ ] 슬랙 알림 연동
- [ ] CI/CD (GitHub Actions)
