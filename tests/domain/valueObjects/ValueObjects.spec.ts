import { describe, it, expect } from 'vitest';
import { ProductData, ProductContentRequest, ProductContentResult } from '../../../src/modules/commerce/domain/valueObjects/ProductData.js';
import { MarketingMetrics, Report } from '../../../src/modules/commerce/domain/valueObjects/MarketingMetrics.js';
import { DateRange } from '../../../src/core/domain/valueObjects/Types.js';

describe('ProductData', () => {
  it('유효한 ProductData를 생성한다', () => {
    const p = new ProductData('글로우 립스틱', '립메이크업', 32000, '촉촉한 립스틱', ['립', '글로우'], ['img1.jpg']);
    expect(p.name).toBe('글로우 립스틱');
    expect(p.price).toBe(32000);
    expect(p.formattedPrice).toBe('₩32,000');
  });

  it('name이 없으면 에러가 발생한다', () => {
    expect(() => new ProductData('', '카테고리', 1000, 'desc', [])).toThrow('name is required');
  });

  it('음수 price는 에러가 발생한다', () => {
    expect(() => new ProductData('테스트', '카테고리', -1000, 'desc', [])).toThrow('price must be non-negative');
  });

  it('images 기본값은 빈 배열이다', () => {
    const p = new ProductData('테스트', '카테고리', 1000, 'desc', ['키워드']);
    expect(p.images).toEqual([]);
  });
});

describe('ProductContentRequest', () => {
  it('필수 파라미터로 생성한다', () => {
    const req = new ProductContentRequest('립스틱', '립', '원본설명', ['립', '스틱']);
    expect(req.name).toBe('립스틱');
    expect(req.targetAudience).toBeUndefined();
    expect(req.tone).toBeUndefined();
  });
});

describe('ProductContentResult', () => {
  it('AI 생성 결과를 저장한다', () => {
    const result = new ProductContentResult(
      '글로우 립스틱',
      '선명한 발색',
      ['립', '글로우'],
      ['지속력', '발색력'],
      'SEO 메타 설명',
      '{"raw": "response"}',
    );
    expect(result.title).toBe('글로우 립스틱');
    expect(result.sellingPoints).toHaveLength(2);
  });
});

describe('MarketingMetrics', () => {
  const period = new DateRange(new Date('2026-01-01'), new Date('2026-01-31'));

  it('유효한 메트릭을 생성한다', () => {
    const m = new MarketingMetrics('meta', 100000, 5000, 200, 3000000, 12000000, period);
    expect(m.source).toBe('meta');
    expect(m.impressions).toBe(100000);
    expect(m.clicks).toBe(5000);
  });

  it('CTR을 계산한다', () => {
    const m = new MarketingMetrics('meta', 10000, 500, 20, 100000, 500000, period);
    expect(m.ctr).toBe(5); // 500/10000 * 100
  });

  it('impressions가 0이면 CTR은 0이다', () => {
    const m = new MarketingMetrics('meta', 0, 0, 0, 0, 0, period);
    expect(m.ctr).toBe(0);
  });

  it('conversionRate를 계산한다', () => {
    const m = new MarketingMetrics('meta', 10000, 500, 25, 100000, 500000, period);
    expect(m.conversionRate).toBe(5); // 25/500 * 100
  });

  it('clicks가 0이면 conversionRate는 0이다', () => {
    const m = new MarketingMetrics('meta', 10000, 0, 0, 0, 0, period);
    expect(m.conversionRate).toBe(0);
  });

  it('ROAS를 계산한다', () => {
    const m = new MarketingMetrics('meta', 10000, 500, 20, 1000000, 5000000, period);
    expect(m.roas).toBe(5); // 5000000/1000000
  });

  it('cost가 0이면 ROAS는 0이다', () => {
    const m = new MarketingMetrics('meta', 10000, 500, 20, 0, 100000, period);
    expect(m.roas).toBe(0);
  });

  it('CPC를 계산한다', () => {
    const m = new MarketingMetrics('naver', 50000, 3000, 100, 1500000, 7000000, period);
    expect(m.cpc).toBe(500); // 1500000/3000
  });

  it('음수 값은 에러가 발생한다', () => {
    expect(() => new MarketingMetrics('meta', -1, 0, 0, 0, 0, period)).toThrow('non-negative');
    expect(() => new MarketingMetrics('meta', 0, -1, 0, 0, 0, period)).toThrow('non-negative');
    expect(() => new MarketingMetrics('meta', 0, 0, 0, -1, 0, period)).toThrow('non-negative');
  });
});

describe('Report', () => {
  const period = new DateRange(new Date('2026-01-01'), new Date('2026-01-31'));

  it('메트릭 목록으로 Report를 생성한다', () => {
    const metrics = [
      new MarketingMetrics('meta', 10000, 500, 20, 1000000, 5000000, period),
      new MarketingMetrics('naver', 20000, 1000, 40, 2000000, 8000000, period),
    ];
    const report = new Report(
      '월간 리포트',
      'AI 요약 텍스트',
      metrics,
      ['Insight 1'],
      ['Recommendation 1'],
    );

    expect(report.title).toBe('월간 리포트');
    expect(report.totalRevenue).toBe(13000000); // 5M + 8M
    expect(report.totalCost).toBe(3000000); // 1M + 2M
    expect(report.overallRoas).toBeCloseTo(4.33, 1); // 13M / 3M
  });

  it('메트릭이 없으면 total은 0이다', () => {
    const report = new Report('빈 리포트', '요약', [], [], []);
    expect(report.totalRevenue).toBe(0);
    expect(report.totalCost).toBe(0);
    expect(report.overallRoas).toBe(0);
  });
});

describe('DateRange', () => {
  it('올바른 기간을 생성한다', () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-31');
    const range = new DateRange(start, end);

    expect(range.start).toBe(start);
    expect(range.end).toBe(end);
    expect(range.durationDays).toBe(30);
  });

  it('start가 end보다 뒤면 에러가 발생한다', () => {
    const start = new Date('2026-02-01');
    const end = new Date('2026-01-01');
    expect(() => new DateRange(start, end)).toThrow('start must be before end');
  });

  it('today(): 오늘 날짜의 DateRange를 생성한다', () => {
    const range = DateRange.today();
    const now = new Date();
    expect(range.start.getFullYear()).toBe(now.getFullYear());
    expect(range.start.getMonth()).toBe(now.getMonth());
    expect(range.start.getDate()).toBe(now.getDate());
    expect(range.start.getHours()).toBe(0);
    expect(range.start.getMinutes()).toBe(0);
  });

  it('thisWeek(): 이번 주의 DateRange를 생성한다', () => {
    const range = DateRange.thisWeek();
    expect(range.start.getDay()).toBe(0); // Sunday
    expect(range.durationDays).toBe(7);
  });

  it('toISOString()으로 직렬화한다', () => {
    const range = new DateRange(new Date('2026-06-01'), new Date('2026-06-30'));
    const iso = range.toISOString();
    expect(iso.start).toBe('2026-06-01T00:00:00.000Z');
    expect(iso.end).toBe('2026-06-30T00:00:00.000Z');
  });
});
