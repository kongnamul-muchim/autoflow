import { DateRange } from '../../domain/valueObjects/Types.js';

export class ReportRequest {
  constructor(
    public readonly period: DateRange,
    public readonly platforms: string[] = ['cafe24', 'meta', 'naver'],
    public readonly generateInsights: boolean = true,
  ) {}
}

export class PipelineRequest {
  constructor(
    public readonly name: string,
    public readonly tasks: Array<{
      name: string;
      type: 'product_description' | 'marketing_report';
      config: Record<string, unknown>;
    }>,
    public readonly schedule?: string,
  ) {}
}
