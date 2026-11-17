export class SummarizeRequest {
  constructor(
    public readonly title: string,
    public readonly content: string,
    public readonly type: string = 'other',
    public readonly author?: string,
  ) {}
}

export class ReportRequest {
  constructor(
    public readonly periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    public readonly department?: string,
    public readonly includeInsights: boolean = true,
  ) {}
}

export class DataEntryRequest {
  constructor(
    public readonly source: string,
    public readonly records: Array<Record<string, string>>,
    public readonly validateOnly: boolean = false,
  ) {}
}
