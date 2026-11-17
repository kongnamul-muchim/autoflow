export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export class ReportSection {
  constructor(
    public readonly title: string,
    public readonly content: string,
    public readonly metrics: Record<string, number> = {},
  ) {}
}

export class OfficeReport {
  constructor(
    public readonly title: string,
    public readonly period: ReportPeriod,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly sections: ReportSection[],
    public readonly summary: string,
    public readonly kpis: Record<string, { current: number; previous: number; unit: string }> = {},
    public readonly insights: string[] = [],
    public readonly generatedAt: Date = new Date(),
  ) {}

  get totalSections(): number {
    return this.sections.length;
  }
}
