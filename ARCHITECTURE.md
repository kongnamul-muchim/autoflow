# AutoFlow — AI 기반 이커머스 업무 자동화 시스템

> **대상:** (주)글로비언트 AX팀 개발자 포트폴리오
> **목표:** Claude Code 기반 사내 AI 자동화 솔루션 개발 역량 증명
> **원칙:** SOLID + DI Container + Clean Architecture
> **언어:** TypeScript (Node.js 20+)

---

## 📦 프로젝트 개요

AutoFlow는 이커머스 회사의 반복적인 업무를 AI로 자동화하는 **에이전트 시스템**이다.

### 핵심 기능
1. **AI 상품 콘텐츠 생성** — 원시 상품 데이터 → AI가 상품명/설명/키워드 자동 생성
2. **마케팅 성과 리포트 자동화** — Meta/Naver/GA4 데이터 취합 → AI 요약 리포트
3. **업무 자동화 파이프라인** — 여러 태스크를 조합한 파이프라인 실행 및 스케줄링
4. **데이터 동기화** — 외부 플랫폼(Cafe24, Meta, Naver) 간 데이터 정합성 관리

### 사용자 인터페이스
- **CLI 모드** — `npx autoflow run pipeline:<name>` 형태의 커맨드라인
- **웹 대시보드** (선택) — 실행 이력, 결과 조회

---

## 🏗️ 전체 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (Interface Adapters)          │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  CliController │  │  DashboardView   │  │   SlackBotHandler    │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│         │                   │                        │              │
├─────────┼───────────────────┼────────────────────────┼──────────────┤
│         ▼                   ▼                        ▼              │
│                    APPLICATION LAYER (Use Cases)                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  CreateProductDescription  │  GenerateMarketingReport        │  │
│  │  SyncExternalData          │  RunAutomationPipeline          │  │
│  └──────────┬───────────────────────────────────────┬──────────┘  │
│             │          (의존성 방향: 외부 → 내부)      │            │
├─────────────┼───────────────────────────────────────┼──────────────┤
│             ▼                                       ▼              │
│                      DOMAIN LAYER (Entities)                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Task  │  Pipeline  │  Result  │  DataSource  │  Report     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│             │                                       ▲              │
├─────────────┼───────────────────────────────────────┼──────────────┤
│             ▼                                       │              │
│                   INFRASTRUCTURE LAYER                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ClaudeApiClient  │  MockCafe24Client  │  FileRepository     │  │
│  │  MetaApiClient    │  NaverApiClient    │  PostgresRepo       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              DI CONTAINER (Composition Root)                  │  │
│  │  container.registerSingleton<Port>(Impl)                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 의존성 규칙 (Dependency Rule)

> **모든 의존성은 외부(인프라) → 내부(도메인) 방향으로만 향한다.**
>
> - Domain Layer: **어떤 외부 라이브러리에도 의존하지 않음** (Pure TypeScript)
> - Application Layer: Domain에만 의존 (인프라를 모름)
> - Infrastructure Layer: Domain의 Port(Interface)를 구현
> - Presentation Layer: Application Layer의 Use Case를 호출
> - **모든 구체 클래스는 DI Container에서 조립되어 주입됨**

---

## 🧩 Domain Layer (순수 비즈니스 모델)

> **위치:** `src/domain/`
> **규칙:** 외부 라이브러리 import 금지. 오직 TypeScript 타입/인터페이스/클래스만.

### 1. 핵심 엔티티 (Entities)

```typescript
// src/domain/entities/Task.ts
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high';

export class Task {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: TaskType,
    public readonly config: TaskConfig,
    public status: TaskStatus = 'pending',
    public priority: TaskPriority = 'medium',
    public readonly createdAt: Date = new Date(),
    public result: TaskResult | null = null,
  ) {}
}

// src/domain/entities/Pipeline.ts
export class Pipeline {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tasks: Task[],
    public readonly schedule?: CronExpression,
    public readonly notifications: NotificationConfig[] = [],
  ) {}
}

// src/domain/entities/Result.ts
export class TaskResult {
  constructor(
    public readonly taskId: string,
    public readonly success: boolean,
    public readonly data: unknown,
    public readonly executedAt: Date,
    public readonly error?: string,
    public readonly metrics?: Record<string, number>,
  ) {}
}
```

### 2. 값 객체 (Value Objects)

```typescript
// src/domain/valueObjects/ProductData.ts
export class ProductData {
  constructor(
    public readonly name: string,
    public readonly category: string,
    public readonly price: number,
    public readonly description: string,
    public readonly keywords: string[],
    public readonly images: string[],
  ) {}
}

// src/domain/valueObjects/MarketingMetrics.ts
export class MarketingMetrics {
  constructor(
    public readonly source: string,        // 'meta' | 'naver' | 'ga4'
    public readonly impressions: number,
    public readonly clicks: number,
    public readonly conversions: number,
    public readonly cost: number,
    public readonly revenue: number,
    public readonly period: DateRange,
  ) {}
}

// src/domain/valueObjects/Report.ts
export class Report {
  constructor(
    public readonly title: string,
    public readonly summary: string,
    public readonly metrics: MarketingMetrics[],
    public readonly insights: string[],
    public readonly recommendations: string[],
    public readonly generatedAt: Date,
  ) {}
}
```

### 3. 포트 인터페이스 (Ports — 의존성 역전의 핵심)

```typescript
// src/domain/ports/IAiService.ts
export interface IAiService {
  generateProductContent(data: ProductContentRequest): Promise<ProductContentResult>;
  generateReportSummary(metrics: MarketingMetrics[]): Promise<string>;
  generateInsights(data: unknown, context: string): Promise<string[]>;
}

// src/domain/ports/IExternalApiClient.ts
export interface IExternalApiClient {
  readonly platform: string;        // 'cafe24' | 'meta' | 'naver' | 'ga4'
  fetchProducts(filter?: ProductFilter): Promise<ProductData[]>;
  fetchMarketingMetrics(period: DateRange): Promise<MarketingMetrics[]>;
  healthCheck(): Promise<boolean>;
}

// src/domain/ports/ITaskRepository.ts
export interface ITaskRepository {
  save(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findAll(filter?: TaskFilter): Promise<Task[]>;
  updateStatus(id: string, status: TaskStatus): Promise<void>;
}

// src/domain/ports/IPipelineRepository.ts
export interface IPipelineRepository {
  save(pipeline: Pipeline): Promise<void>;
  findById(id: string): Promise<Pipeline | null>;
  findAll(): Promise<Pipeline[]>;
  delete(id: string): Promise<void>;
}

// src/domain/ports/INotificationService.ts
export interface INotificationService {
  send(channel: NotificationChannel, message: NotificationMessage): Promise<void>;
}

// src/domain/ports/ILogger.ts
export interface ILogger {
  info(context: string, message: string, data?: Record<string, unknown>): void;
  warn(context: string, message: string, data?: Record<string, unknown>): void;
  error(context: string, message: string, error?: unknown): void;
  debug(context: string, message: string, data?: Record<string, unknown>): void;
}
```

---

## 🎯 Application Layer (유스케이스)

> **위치:** `src/application/usecases/`
> **규칙:** Domain의 Port(인터페이스)에만 의존. 구체 클래스는 절대 import하지 않음.
> **생성자:** DI Container가 주입할 인터페이스만 받음.

```typescript
// src/application/usecases/CreateProductDescription.ts
export class CreateProductDescription {
  // ── DI: 인터페이스만 받는다 (DIP 만족) ──
  constructor(
    private readonly aiService: IAiService,
    private readonly repository: ITaskRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(request: CreateProductRequest): Promise<TaskResult> {
    this.logger.info('CreateProductDescription', 'Starting product description generation', { productName: request.name });

    const task = new Task(
      crypto.randomUUID(),
      `상품설명_${request.name}`,
      'product_description',
      { productData: request },
    );

    await this.repository.save(task);

    try {
      const content = await this.aiService.generateProductContent({
        name: request.name,
        category: request.category,
        originalDescription: request.rawDescription,
        keywords: request.keywords,
      });

      const result = new TaskResult(
        task.id,
        true,
        { generatedContent: content },
        new Date(),
      );

      task.status = 'completed';
      task.result = result;
      await this.repository.updateStatus(task.id, 'completed');

      return result;
    } catch (error) {
      task.status = 'failed';
      await this.repository.updateStatus(task.id, 'failed');
      this.logger.error('CreateProductDescription', 'Generation failed', error);
      throw error;
    }
  }
}

// src/application/usecases/GenerateMarketingReport.ts
export class GenerateMarketingReport {
  constructor(
    private readonly apiClients: IExternalApiClient[],   // 여러 플랫폼
    private readonly aiService: IAiService,
    private readonly repository: ITaskRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(period: DateRange): Promise<Report> {
    // 1. 모든 API 클라이언트에서 메트릭 수집
    const allMetrics: MarketingMetrics[] = [];
    for (const client of this.apiClients) {
      try {
        const metrics = await client.fetchMarketingMetrics(period);
        allMetrics.push(...metrics);
      } catch (error) {
        this.logger.error('GenerateMarketingReport', `Failed to fetch from ${client.platform}`, error);
      }
    }

    // 2. AI가 요약문 생성
    const summary = await this.aiService.generateReportSummary(allMetrics);
    const insights = await this.aiService.generateInsights(allMetrics, 'marketing');

    // 3. 리포트 생성
    return new Report(
      `마케팅 성과 리포트 (${period.start.toLocaleDateString()} ~ ${period.end.toLocaleDateString()})`,
      summary,
      allMetrics,
      insights,
      [],  // recommendations (고급 기능)
      new Date(),
    );
  }
}
```

### 유스케이스 목록

| 유스케이스 | 파일 | 설명 |
|-----------|------|------|
| `CreateProductDescription` | `src/application/usecases/CreateProductDescription.ts` | AI 상품 설명 생성 |
| `GenerateMarketingReport` | `src/application/usecases/GenerateMarketingReport.ts` | 마케팅 성과 리포트 생성 |
| `SyncExternalData` | `src/application/usecases/SyncExternalData.ts` | 외부 플랫폼간 데이터 동기화 |
| `RunAutomationPipeline` | `src/application/usecases/RunAutomationPipeline.ts` | 복수 태스크 파이프라인 실행 |
| `SchedulePipeline` | `src/application/usecases/SchedulePipeline.ts` | 파이프라인 스케줄링 관리 |

---

## 🔌 Infrastructure Layer (구현체)

> **위치:** `src/infrastructure/`
> **규칙:** Domain의 Port 인터페이스를 구현. 구체적 기술 스택 사용.

### AI 서비스 구현

```typescript
// src/infrastructure/ai/ClaudeApiClient.ts
export class ClaudeApiClient implements IAiService {
  constructor(
    private readonly config: AiConfig,
    private readonly logger: ILogger,
  ) {}

  async generateProductContent(data: ProductContentRequest): Promise<ProductContentResult> {
    const prompt = this.buildProductPrompt(data);
    const response = await this.callClaudeApi(prompt);
    return this.parseProductContent(response);
  }

  async generateReportSummary(metrics: MarketingMetrics[]): Promise<string> {
    const prompt = this.buildReportPrompt(metrics);
    const response = await this.callClaudeApi(prompt);
    return response.content[0].text;
  }

  private async callClaudeApi(prompt: string): Promise<ClaudeResponse> {
    this.logger.debug('ClaudeApiClient', 'Calling Claude API', { promptLength: prompt.length });
    // 실제 HTTP 호출 (fetch / axios)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    return response.json();
  }
}
```

### 외부 API 클라이언트 (Mock → 실제 전환 가능 구조)

```typescript
// src/infrastructure/api/MockExternalApiClient.ts
// ── Strategy Pattern: 각 플랫폼마다 다른 구현체, 동일한 인터페이스 ──

export class MockCafe24Client implements IExternalApiClient {
  readonly platform = 'cafe24';

  constructor(
    private readonly config: ApiConfig,
    private readonly logger: ILogger,
  ) {}

  async fetchProducts(filter?: ProductFilter): Promise<ProductData[]> {
    this.logger.info('MockCafe24Client', 'Fetching products (MOCK)', { filter });
    return [
      new ProductData(
        '[Mock] 글로우 립스틱',
        '립메이크업',
        32000,
        '선명한 발색과 글로우 마무리감의 립스틱',
        ['립스틱', '글로우', '발색'],
        ['https://example.com/img1.jpg'],
      ),
      // × 10개 정도 Mock 데이터
    ];
  }

  async fetchMarketingMetrics(period: DateRange): Promise<MarketingMetrics[]> {
    return [/* Mock 메트릭 데이터 */];
  }

  async healthCheck(): Promise<boolean> { return true; }
}

// src/infrastructure/api/MetaAdsClient.ts (추후 실제 구현)
export class MetaAdsClient implements IExternalApiClient {
  readonly platform = 'meta';
  // fetchProducts, fetchMarketingMetrics 실제 구현...
}

// src/infrastructure/api/NaverSearchAdClient.ts (추후 실제 구현)
export class NaverSearchAdClient implements IExternalApiClient {
  readonly platform = 'naver';
  // ...
}

// src/infrastructure/api/Ga4Client.ts (추후 실제 구현)
export class Ga4Client implements IExternalApiClient {
  readonly platform = 'ga4';
  // ...
}
```

### Repository 구현

```typescript
// src/infrastructure/repository/JsonFileTaskRepository.ts
export class JsonFileTaskRepository implements ITaskRepository {
  private readonly storagePath: string;

  constructor(
    @inject('StorageConfig') private readonly config: StorageConfig,
    private readonly logger: ILogger,
  ) {
    this.storagePath = path.join(config.basePath, 'tasks.json');
  }

  async save(task: Task): Promise<void> {
    const tasks = await this.loadAll();
    tasks.set(task.id, task);
    await this.persistAll(tasks);
    this.logger.debug('JsonFileTaskRepository', `Saved task ${task.id}`);
  }

  async findById(id: string): Promise<Task | null> {
    const tasks = await this.loadAll();
    return tasks.get(id) ?? null;
  }

  async findAll(filter?: TaskFilter): Promise<Task[]> {
    const tasks = Array.from((await this.loadAll()).values());
    if (filter?.status) return tasks.filter(t => t.status === filter.status);
    return tasks;
  }

  private async loadAll(): Promise<Map<string, Task>> {
    const data = await fs.readFile(this.storagePath, 'utf-8').catch(() => '{}');
    return new Map(Object.entries(JSON.parse(data)));
  }

  private async persistAll(tasks: Map<string, Task>): Promise<void> {
    await fs.writeFile(this.storagePath, JSON.stringify(Object.fromEntries(tasks), null, 2));
  }
}

// src/infrastructure/repository/PostgresPipelineRepository.ts (추후 고도화)
```

---

## 💉 DI Container (Composition Root)

> **위치:** `src/di/container.ts`
> **라이브러리:** `tsyringe` (경량, 데코레이터 기반 DI)

### 컨테이너 설정

```typescript
// src/di/container.ts
import { container, Lifecycle } from 'tsyringe';

// ── 모든 의존성 등록은 이 파일에서 한 번에 (Composition Root 패턴) ──

// === Infrastucture Layer ===
container.registerSingleton<ILogger>('ILogger', ConsoleLogger);
container.registerSingleton<IConfig>('IConfig', EnvironmentConfig);

// AI Service
container.register<IAiService>('IAiService', ClaudeApiClient, Lifecycle.Singleton);

// External API Clients (Strategy Pattern — 배열 주입)
container.register<IExternalApiClient>('Cafe24Client', MockCafe24Client, Lifecycle.Singleton);
container.register<IExternalApiClient>('MetaClient', MockMetaClient, Lifecycle.Singleton);
container.register<IExternalApiClient>('NaverClient', MockNaverClient, Lifecycle.Singleton);

// Repositories
container.registerSingleton<ITaskRepository>('ITaskRepository', JsonFileTaskRepository);
container.registerSingleton<IPipelineRepository>('IPipelineRepository', JsonFilePipelineRepository);

// Notification
container.register<INotificationService>('INotificationService', ConsoleNotificationService, Lifecycle.Singleton);

// === Application Layer (Use Cases) ===
container.registerSingleton(CreateProductDescription);
container.registerSingleton(GenerateMarketingReport);
container.registerSingleton(SyncExternalData);
container.registerSingleton(RunAutomationPipeline);

// === Presentation Layer ===
container.registerSingleton(CliController);

export { container };
```

### 환경별 컨테이너 프로필

```typescript
// src/di/profiles/development.ts — Mock 클라이언트 사용
import { container } from '../container';
container.register<IExternalApiClient>('Cafe24Client', MockCafe24Client);
container.register<IExternalApiClient>('MetaClient', MockMetaClient);

// src/di/profiles/production.ts — 실제 API 클라이언트 사용
import { container } from '../container';
container.register<IExternalApiClient>('Cafe24Client', RealCafe24Client);
container.register<IExternalApiClient>('MetaClient', MetaAdsClient);
```

---

## 🧪 SOLID 원칙 적용 검증

### S — 단일 책임 원칙 (Single Responsibility)
| 클래스 | 책임 | 변경 이유 |
|--------|------|---------|
| `ClaudeApiClient` | Anthropic Claude API 호출 | API 엔드포인트/버전 변경 |
| `JsonFileTaskRepository` | JSON 파일读写 | 저장소 포맷/위치 변경 |
| `CreateProductDescription` | 상품설명 생성 유스케이스 조율 | 비즈니스 로직 변경 |
| `MockCafe24Client` | Cafe24 모킹 | Mock 데이터 변경 |

### O — 개방-폐쇄 원칙 (Open-Closed)
```typescript
// 신규 플랫폼 추가 = IExternalApiClient 구현체 하나만 추가
// 기존 코드는 전혀 수정하지 않음
class KakaoShoppingClient implements IExternalApiClient {
  readonly platform = 'kakao';
  async fetchProducts(filter?: ProductFilter): Promise<ProductData[]> { /* ... */ }
  // ...
}
// → DI Container에 register<IExternalApiClient>('KakaoClient', KakaoShoppingClient) 한 줄 추가로 끝
```

### L — 리스코프 치환 원칙 (Liskov Substitution)
```typescript
// 모든 IExternalApiClient 구현체는 동일 계약을 따름
function processAllPlatforms(clients: IExternalApiClient[]) {
  for (const client of clients) {
    // MockCafe24Client든 MetaAdsClient든 예외 없이 동작해야 함
    const metrics = await client.fetchMarketingMetrics(period);
    processMetrics(metrics);
  }
}
```

### I — 인터페이스 분리 원칙 (Interface Segregation)
```typescript
// Bad: 거대한 인터페이스
interface IBadAllInOne {
  fetchProducts(): Promise<ProductData[]>;
  fetchMetrics(): Promise<Metrics[]>;
  generateContent(): Promise<string>;
  sendNotification(): Promise<void>;
}

// Good: 작은 인터페이스로 분리
interface IExternalApiClient { fetchProducts, fetchMarketingMetrics, healthCheck }
interface IAiService { generateProductContent, generateReportSummary, generateInsights }
interface INotificationService { send }
interface IRepository<T> { save, findById, findAll }
```

### D — 의존성 역전 원칙 (Dependency Inversion)
```typescript
// Bad: 구체 클래스에 직접 의존
class BadUseCase {
  private api = new ClaudeApiClient(/* ... */);  // ❌ 추상화가 아닌 구체에 의존
}

// Good: 인터페이스에 의존 (DI Container가 주입)
class GoodUseCase {
  constructor(
    private readonly aiService: IAiService,  // ✅ 추상화(인터페이스)에 의존
  ) {}
}
```

---

## 📁 전체 파일 구조

```
portfolio-autoflow/
├── ARCHITECTURE.md              ← 이 문서
├── README.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
│
├── src/
│   ├── main.ts                  ← Entry Point (컨테이너 초기화, CLI 실행)
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Task.ts
│   │   │   ├── Pipeline.ts
│   │   │   └── Result.ts
│   │   ├── valueObjects/
│   │   │   ├── ProductData.ts
│   │   │   ├── MarketingMetrics.ts
│   │   │   ├── Report.ts
│   │   │   └── Types.ts         (DateRange, TaskType, etc.)
│   │   └── ports/
│   │       ├── IAiService.ts
│   │       ├── IExternalApiClient.ts
│   │       ├── ITaskRepository.ts
│   │       ├── IPipelineRepository.ts
│   │       ├── INotificationService.ts
│   │       └── ILogger.ts
│   │
│   ├── application/
│   │   ├── usecases/
│   │   │   ├── CreateProductDescription.ts
│   │   │   ├── GenerateMarketingReport.ts
│   │   │   ├── SyncExternalData.ts
│   │   │   ├── RunAutomationPipeline.ts
│   │   │   └── SchedulePipeline.ts
│   │   └── dto/
│   │       ├── CreateProductRequest.ts
│   │       ├── ReportRequest.ts
│   │       └── PipelineRequest.ts
│   │
│   ├── infrastructure/
│   │   ├── ai/
│   │   │   └── ClaudeApiClient.ts
│   │   ├── api/
│   │   │   ├── MockCafe24Client.ts
│   │   │   ├── MockMetaClient.ts
│   │   │   └── MockNaverClient.ts
│   │   ├── repository/
│   │   │   ├── JsonFileTaskRepository.ts
│   │   │   └── JsonFilePipelineRepository.ts
│   │   ├── notification/
│   │   │   └── ConsoleNotificationService.ts
│   │   ├── logger/
│   │   │   └── ConsoleLogger.ts
│   │   └── config/
│   │       └── EnvironmentConfig.ts
│   │
│   ├── di/
│   │   ├── container.ts                   ← Composition Root
│   │   └── profiles/
│   │       ├── development.ts
│   │       └── production.ts
│   │
│   └── presentation/
│       ├── cli/
│       │   ├── CliController.ts
│       │   ├── commands/
│       │   │   ├── productCommand.ts
│       │   │   ├── reportCommand.ts
│       │   │   └── pipelineCommand.ts
│       │   └── formatters/
│       │       └── TableFormatter.ts
│       └── dashboard/                     (선택 — 추후 구현)
│           └── ...
│
└── tests/
    ├── domain/
    │   ├── entities/
    │   │   ├── Task.spec.ts
    │   │   └── Pipeline.spec.ts
    │   └── valueObjects/
    │       ├── ProductData.spec.ts
    │       └── MarketingMetrics.spec.ts
    ├── application/
    │   └── usecases/
    │       ├── CreateProductDescription.spec.ts
    │       ├── GenerateMarketingReport.spec.ts
    │       └── RunAutomationPipeline.spec.ts
    └── infrastructure/
        ├── ai/
        │   └── ClaudeApiClient.spec.ts
        ├── api/
        │   ├── MockCafe24Client.spec.ts
        │   └── MockMetaClient.spec.ts
        └── repository/
            └── JsonFileTaskRepository.spec.ts
```

---

## 🔄 데이터 흐름 예시

### 시나리오: "오늘의 마케팅 리포트를 생성해서 Slack으로 보내줘"

```
사용자 (CLI)
  │  autoflow report:daily --period today
  ▼
CliController.reportDaily(period)
  │
  ├─▸ DI → GenerateMarketingReport 유스케이스 생성
  │
  ▼
GenerateMarketingReport.execute(period)
  │
  ├─▸ DI → IExternalApiClient[] (MockCafe24, MockMeta, MockNaver)
  │     └─ fetchMarketingMetrics(period)
  │
  ├─▸ DI → IAiService (ClaudeApiClient)
  │     └─ generateReportSummary(metrics)
  │     └─ generateInsights(metrics)
  │
  ├─▸ Report 생성
  │
  ├─▸ DI → INotificationService (ConsoleNotificationService → 추후 Slack)
  │     └─ send('slack', report)
  │
  ▼
TaskResult 반환 → CLI 출력
```

---

## 🚀 실행 방법

```bash
# 개발 모드 (Mock API 사용)
npm run dev -- report:daily

# 프로덕션 모드 (실제 API 사용)
NODE_ENV=production npm run start -- report:daily

# 상품 설명 생성
npm run dev -- product:describe "글로우 립스틱" --category 립

# 파이프라인 실행
npm run dev -- pipeline:run daily-report
```

---

## 🧪 테스트 전략

| 계층 | 테스트 방식 | 예시 |
|------|-----------|------|
| **Domain** | 순수 단위 테스트 (모킹 불필요) | `Task` 생성/상태변경, `ProductData` 검증 |
| **Application** | Use Case 테스트 (인터페이스 모킹) | `CreateProductDescription` 실행 시나리오 |
| **Infrastructure** | 통합 테스트 (파일/API 모킹) | `JsonFileTaskRepository` 저장/조회 |
| **DI Container** | 컨테이너 등록/해소 검증 | 모든 인터페이스가 올바른 구현체로 주입되는지 |

```typescript
// tests/application/usecases/CreateProductDescription.spec.ts
describe('CreateProductDescription', () => {
  let useCase: CreateProductDescription;
  let mockAiService: Mock<IAiService>;
  let mockRepo: Mock<ITaskRepository>;
  let mockLogger: Mock<ILogger>;

  beforeEach(() => {
    mockAiService = { generateProductContent: vi.fn() };
    mockRepo = { save: vi.fn(), updateStatus: vi.fn() };
    mockLogger = { info: vi.fn(), error: vi.fn() };
    useCase = new CreateProductDescription(mockAiService as any, mockRepo as any, mockLogger as any);
  });

  it('AI 서비스를 호출하여 상품 설명을 생성한다', async () => {
    const request: CreateProductRequest = { name: '테스트', /* ... */ };
    mockAiService.generateProductContent.mockResolvedValue({ title: '생성된 제목', /* ... */ });

    const result = await useCase.execute(request);

    expect(result.success).toBe(true);
    expect(mockAiService.generateProductContent).toHaveBeenCalledOnce();
    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockRepo.updateStatus).toHaveBeenCalledWith(expect.any(String), 'completed');
  });
});
```

---

## 📌 이 구조가 공고에 어필하는 이유

| 공고 우대사항 | 이 구조에서 증명하는 것 |
|--------------|----------------------|
| **AI 코딩 도구 실무 활용 경험** | Claude Code API 연동, MCP 스타일 아키텍처 |
| **솔루션 개발 기획 능력** | 유스케이스 기반 설계, 확장 가능한 플러그인 구조 |
| **외부 API 연동 및 ETL** | Strategy Pattern으로 여러 외부 API를 동일 인터페이스로 추상화 |
| **이커머스 도메인 경험** | Cafe24/Meta/Naver/GA4를 직접 타겟팅한 도메인 모델 |
| **클라우드 배포 경험** | Railway/Vercel/AWS에 배포 가능한 Node.js 패키지 구조 |
| **SOLID 원칙 숙련도** | 각 원칙별 적용 사례를 명확히 문서화 |

---

> **다음 단계:**
> 1. 위 구조에 동의하면 — `package.json` + `tsconfig.json` + DI Container 세팅부터 시작
> 2. TDD로 Domain Entity → Port → Infrastructure → Use Case 순으로 구현
> 3. CLI Controller 연결 → 시연 가능한 데모 완성
