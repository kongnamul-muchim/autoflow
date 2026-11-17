import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateMarketingReport } from '../../../src/modules/commerce/application/usecases/GenerateMarketingReport.js';
import { IAiService } from '../../../src/core/domain/ports/IAiService.js';
import { IExternalApiClient } from '../../../src/modules/commerce/domain/ports/IExternalApiClient.js';
import { ILogger } from '../../../src/core/domain/ports/ILogger.js';
import { ReportRequest } from '../../../src/modules/commerce/application/dto/PipelineRequest.js';
import { MarketingMetrics } from '../../../src/modules/commerce/domain/valueObjects/MarketingMetrics.js';
import { DateRange } from '../../../src/core/domain/valueObjects/Types.js';

const mockLogger: ILogger = {
  level: 'debug',
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function createMockClient(platform: string, metrics: MarketingMetrics[]): IExternalApiClient {
  return {
    platform,
    fetchProducts: vi.fn().mockResolvedValue([]),
    fetchMarketingMetrics: vi.fn().mockResolvedValue(metrics),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

describe('GenerateMarketingReport', () => {
  let useCase: GenerateMarketingReport;
  let mockAiService: IAiService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAiService = {
      generateText: vi.fn().mockResolvedValue('AI 생성 요약입니다.'),
    };
  });

  it('모든 플랫폼에서 메트릭을 수집하여 리포트를 생성한다', async () => {
    const period = DateRange.today();
    const mockClients = [
      createMockClient('cafe24', [new MarketingMetrics('cafe24', 1000, 100, 10, 500000, 2000000, period)]),
      createMockClient('meta', [new MarketingMetrics('meta', 5000, 300, 15, 1500000, 6000000, period)]),
    ];

    useCase = new GenerateMarketingReport(mockClients, mockAiService, mockLogger);
    const report = await useCase.execute(new ReportRequest(period, ['cafe24', 'meta']));

    expect(report.metrics).toHaveLength(2);
    expect(report.totalRevenue).toBe(8000000); // 2M + 6M
  });

  it('일부 플랫폼 실패 시에도 나머지 데이터로 리포트를 생성한다', async () => {
    const period = DateRange.today();
    const failingClient: IExternalApiClient = {
      platform: 'broken',
      fetchProducts: vi.fn(),
      fetchMarketingMetrics: vi.fn().mockRejectedValue(new Error('Connection failed')),
      healthCheck: vi.fn(),
    };
    const workingClient = createMockClient(
      'cafe24',
      [new MarketingMetrics('cafe24', 1000, 100, 10, 500000, 2000000, period)],
    );

    useCase = new GenerateMarketingReport([workingClient, failingClient], mockAiService, mockLogger);
    const report = await useCase.execute(new ReportRequest(period, ['cafe24']));

    expect(report.metrics.length).toBeGreaterThanOrEqual(1);
    expect(report.metrics[0].source).toBe('cafe24');
  });

  it('AI 요약을 포함한 리포트를 생성한다', async () => {
    const period = DateRange.thisWeek();
    const mockClient = createMockClient(
      'naver',
      [new MarketingMetrics('naver', 3000, 200, 8, 800000, 3500000, period)],
    );

    useCase = new GenerateMarketingReport([mockClient], mockAiService, mockLogger);
    const report = await useCase.execute(new ReportRequest(period, ['naver']));

    expect(report.summary).toBe('AI 생성 요약입니다.');
  });

  it('요청한 플랫폼만 필터링한다', async () => {
    const period = DateRange.today();
    const cafe24 = createMockClient(
      'cafe24',
      [new MarketingMetrics('cafe24', 100, 10, 1, 50000, 200000, period)],
    );
    const meta = createMockClient(
      'meta',
      [new MarketingMetrics('meta', 200, 20, 2, 100000, 400000, period)],
    );

    useCase = new GenerateMarketingReport([cafe24, meta], mockAiService, mockLogger);
    const report = await useCase.execute(new ReportRequest(period, ['cafe24']));

    expect(report.metrics).toHaveLength(1);
    expect(report.metrics[0].source).toBe('cafe24');
  });
});
