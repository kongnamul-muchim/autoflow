import { DateRange } from '../../../../core/domain/valueObjects/Types.js';

export class ReportRequest {
  constructor(
    public readonly period: DateRange,
    public readonly platforms: string[],
    public readonly generateInsights: boolean = true,
  ) {}
}
