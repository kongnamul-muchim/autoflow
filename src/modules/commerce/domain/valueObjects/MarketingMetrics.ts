import { DateRange } from '../../../../core/domain/valueObjects/Types.js';

export class MarketingMetrics {
  constructor(
    public readonly source: string,
    public readonly impressions: number,
    public readonly clicks: number,
    public readonly conversions: number,
    public readonly cost: number,
    public readonly revenue: number,
    public readonly period: DateRange,
  ) {
    if (impressions < 0 || clicks < 0 || conversions < 0 || cost < 0 || revenue < 0) {
      throw new Error('metrics values must be non-negative');
    }
  }

  get ctr(): number {
    return this.impressions > 0 ? (this.clicks / this.impressions) * 100 : 0;
  }

  get conversionRate(): number {
    return this.clicks > 0 ? (this.conversions / this.clicks) * 100 : 0;
  }

  get roas(): number {
    return this.cost > 0 ? this.revenue / this.cost : 0;
  }

  get cpc(): number {
    return this.clicks > 0 ? this.cost / this.clicks : 0;
  }

  get cpa(): number {
    return this.conversions > 0 ? this.cost / this.conversions : 0;
  }
}

export class Report {
  constructor(
    public readonly title: string,
    public readonly summary: string,
    public readonly metrics: MarketingMetrics[],
    public readonly insights: string[] = [],
    public readonly recommendations: string[] = [],
  ) {}

  get totalRevenue(): number {
    return this.metrics.reduce((sum, m) => sum + m.revenue, 0);
  }

  get totalCost(): number {
    return this.metrics.reduce((sum, m) => sum + m.cost, 0);
  }

  get overallRoas(): number {
    return this.totalCost > 0 ? this.totalRevenue / this.totalCost : 0;
  }
}
