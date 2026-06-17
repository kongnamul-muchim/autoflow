import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenerateMarketingReport } from '../../../src/application/usecases/GenerateMarketingReport';
import { IAiService } from '../../../src/domain/ports/IAiService';
import { IExternalApiClient } from '../../../src/domain/ports/IExternalApiClient';
import { ILogger } from '../../../src/domain/ports/ILogger';
import { ReportRequest } from '../../../src/application/dto/PipelineRequest';
import { ProductData } from '../../../src/domain/valueObjects/ProductData';
import { MarketingMetrics } from '../../../src/domain/valueObjects/MarketingMetrics';
import { DateRange } from '../../../src/domain/valueObjects/Types';

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
    fetchProducts: vi.fn().mockResolvedValue([] as ProductData[]),
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
      generateProductContent: vi.fn(),
      generateReportSummary: vi.fn().mockResolvedValue('AI 생성 요약입니다.'),
      generateInsights: vi.fn().mockResolvedValue(['Insight 1', 'Insight 2']),
    };
  });

  it('모든 플랫폼에서 메트릭을 수집하여 리포트를 생성한다', async () => {
    const period = DateRange.today();
    const mockClients = [
      createMockClient('cafe24', [new MarketingMetrics('cafe24', 1000, 100, 10, 500000, 2000000, period)]),
      createMockClient('meta', [new MarketingMetrics('meta', 5000, 300, 15, 1500000, 6000000, period)]),
    ];

    useCase = new GenerateMarketingReport(mockClients, mockAiService, mockLogger);

    const result = await useCase.execute(new ReportRequest(period, ['cafe24', 'meta']));

    expect(result.report.metrics).toHaveLength(2);
    expect(result.report.totalRevenue).toBe(8000000); // 2M + 6M
    expect(result.task.status).toBe('completed');
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

    const result = await useCase.execute(new ReportRequest(period));

    // Even with failures, report should still be generated
    expect(result.report.metrics.length).toBeGreaterThanOrEqual(1);
    expect(result.report.metrics[0].source).toBe('cafe24');
  });

  it('AI 요약을 포함한 리포트를 생성한다', async () => {
    const period = DateRange.thisWeek();
    const mockClient = createMockClient(
      'naver',
      [new MarketingMetrics('naver', 3000, 200, 8, 800000, 3500000, period)],
    );

    useCase = new GenerateMarketingReport([mockClient], mockAiService, mockLogger);

    const result = await useCase.execute(new ReportRequest(period, ['naver']));

    expect(result.report.summary).toBe('AI 생성 요약입니다.');
    expect(result.report.insights).toHaveLength(2);
    expect(result.report.insights[0]).toBe('Insight 1');
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

    const result = await useCase.execute(new ReportRequest(period, ['cafe24']));

    expect(result.report.metrics).toHaveLength(1);
    expect(result.report.metrics[0].source).toBe('cafe24');
  });
});
