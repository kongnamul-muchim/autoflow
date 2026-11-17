import { describe, it, expect, beforeEach } from 'vitest';
import { MockCafe24Client, MockMetaClient, MockNaverClient } from '../../../src/modules/commerce/infrastructure/api/MockClients.js';
import { ILogger } from '../../../src/core/domain/ports/ILogger.js';
import { DateRange } from '../../../src/core/domain/valueObjects/Types.js';

// Silent logger for tests
class TestLogger implements ILogger {
  level = 'debug' as any;
  debug() { /* noop */ }
  info() { /* noop */ }
  warn() { /* noop */ }
  error() { /* noop */ }
}

const logger = new TestLogger();
const period = new DateRange(new Date('2026-01-01'), new Date('2026-01-31'));

describe('MockCafe24Client', () => {
  let client: MockCafe24Client;

  beforeEach(() => {
    client = new MockCafe24Client(logger);
  });

  it('platform이 cafe24다', () => {
    expect(client.platform).toBe('cafe24');
  });

  it('상품 목록을 반환한다', async () => {
    const products = await client.fetchProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].name).toBeDefined();
    expect(products[0].price).toBeGreaterThan(0);
  });

  it('카테고리로 필터링한다', async () => {
    const products = await client.fetchProducts({ category: '아이메이크업' });
    expect(products.every(p => p.category === '아이메이크업')).toBe(true);
  });

  it('가격 범위로 필터링한다', async () => {
    const products = await client.fetchProducts({ minPrice: 30000, maxPrice: 40000 });
    expect(products.every(p => p.price >= 30000 && p.price <= 40000)).toBe(true);
  });

  it('limit으로 결과 수를 제한한다', async () => {
    const products = await client.fetchProducts({ limit: 2 });
    expect(products.length).toBeLessThanOrEqual(2);
  });

  it('마케팅 메트릭을 반환한다', async () => {
    const metrics = await client.fetchMarketingMetrics(period);
    expect(metrics.length).toBe(1);
    expect(metrics[0].source).toBe('cafe24');
    expect(metrics[0].revenue).toBeGreaterThan(0);
  });

  it('healthCheck가 true를 반환한다', async () => {
    expect(await client.healthCheck()).toBe(true);
  });
});

describe('MockMetaClient', () => {
  let client: MockMetaClient;

  beforeEach(() => {
    client = new MockMetaClient(logger);
  });

  it('platform이 meta다', () => {
    expect(client.platform).toBe('meta');
  });

  it('상품 목록은 빈 배열이다', async () => {
    const products = await client.fetchProducts();
    expect(products).toEqual([]);
  });

  it('마케팅 메트릭을 반환한다 (Meta + Instagram)', async () => {
    const metrics = await client.fetchMarketingMetrics(period);
    expect(metrics.length).toBe(2);
    expect(metrics[0].source).toBe('meta');
    expect(metrics[1].source).toBe('meta_instagram');
  });
});

describe('MockNaverClient', () => {
  let client: MockNaverClient;

  beforeEach(() => {
    client = new MockNaverClient(logger);
  });

  it('platform이 naver다', () => {
    expect(client.platform).toBe('naver');
  });

  it('마케팅 메트릭을 반환한다 (PowerLink + Shopping)', async () => {
    const metrics = await client.fetchMarketingMetrics(period);
    expect(metrics.length).toBe(2);
    expect(metrics[0].source).toBe('naver_powerlink');
    expect(metrics[1].source).toBe('naver_shopping');
  });
});
