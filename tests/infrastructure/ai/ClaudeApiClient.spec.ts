import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeApiClient } from '../../../src/infrastructure/ai/ClaudeApiClient';
import { ILogger } from '../../../src/domain/ports/ILogger';
import { IConfigService, AppConfig } from '../../../src/domain/ports/IConfigService';
import { ProductContentRequest, ProductContentResult } from '../../../src/domain/valueObjects/ProductData';
import { MarketingMetrics } from '../../../src/domain/valueObjects/MarketingMetrics';
import { DateRange } from '../../../src/domain/valueObjects/Types';

class TestLogger implements ILogger {
  level = 'debug' as any;
  messages: { level: string; msg: string }[] = [];
  debug(_ctx: string, msg: string) { this.messages.push({ level: 'debug', msg }); }
  info(_ctx: string, msg: string) { this.messages.push({ level: 'info', msg }); }
  warn(_ctx: string, msg: string) { this.messages.push({ level: 'warn', msg }); }
  error(_ctx: string, msg: string) { this.messages.push({ level: 'error', msg }); }
}

const logger = new TestLogger();
const mockConfig: AppConfig = {
  nodeEnv: 'test',
  anthropicApiKey: '', // empty → Mock fallback
  dataDir: './data',
  apiKeys: {},
};

describe('ClaudeApiClient', () => {
  let client: ClaudeApiClient;

  beforeEach(() => {
    logger.messages = [];
    client = new ClaudeApiClient(logger, mockConfig);
  });

  describe('generateProductContent', () => {
    it('Mock 모드에서 상품 콘텐츠를 생성한다', async () => {
      const request = new ProductContentRequest('글로우 립스틱', '립메이크업', '촉촉한 립스틱', ['립', '글로우']);

      const result = await client.generateProductContent(request);

      expect(result).toBeInstanceOf(ProductContentResult);
      expect(result.title).toBe('글로우 립스틱');
      expect(result.description).toBeTruthy();
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.sellingPoints.length).toBeGreaterThan(0);
      expect(result.seoDescription).toBeTruthy();
    });

    it('API 키가 없으면 Mock fallback 경고를 로깅한다', async () => {
      await client.generateProductContent(
        new ProductContentRequest('테스트', '카테고리', '설명', []),
      );

      const hasWarn = logger.messages.some(m => m.level === 'warn' && m.msg.includes('No API key'));
      expect(hasWarn).toBe(true);
    });

    it('대상 고객과 톤을 포함하여 생성한다', async () => {
      const request = new ProductContentRequest(
        '립스틱', '립', '설명', ['립'],
        '20대 여성', '캐주얼',
      );

      const result = await client.generateProductContent(request);
      expect(result.title).toBeTruthy();
    });
  });

  describe('generateReportSummary', () => {
    it('Mock 모드에서 리포트 요약을 생성한다', async () => {
      const period = DateRange.today();
      const metrics = [
        new MarketingMetrics('meta', 10000, 500, 20, 1000000, 5000000, period),
        new MarketingMetrics('naver', 5000, 300, 10, 500000, 2000000, period),
      ];

      const summary = await client.generateReportSummary(metrics);

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
      expect(summary).toContain('안정적인'); // Mock response contains Korean text
    });
  });

  describe('generateInsights', () => {
    it('데이터로부터 인사이트를 추출한다', async () => {
      const insights = await client.generateInsights(
        { revenue: 1000000, cost: 200000 },
        'marketing',
      );

      expect(Array.isArray(insights)).toBe(true);
    });
  });
});
