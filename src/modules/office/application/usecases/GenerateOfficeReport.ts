import * as crypto from 'node:crypto';
import { IAiService } from '../../../../core/domain/ports/IAiService.js';
import { ILogger } from '../../../../core/domain/ports/ILogger.js';
import { IOfficeApiClient } from '../../domain/ports/IOfficeApiClient.js';
import { OfficeReport, ReportSection } from '../../domain/valueObjects/OfficeReport.js';
import { DateRange } from '../../../../core/domain/valueObjects/Types.js';
import { ReportRequest } from '../dto/DocumentRequest.js';

export class GenerateOfficeReport {
  constructor(
    private readonly apiClients: IOfficeApiClient[],
    private readonly aiService: IAiService,
    private readonly logger: ILogger,
  ) {}

  async execute(request: ReportRequest): Promise<OfficeReport> {
    this.logger.info('GenerateOfficeReport', 'Starting report generation', {
      period: request.periodType,
      department: request.department,
    });

    const now = new Date();
    const period = DateRange.thisWeek();

    // Gather data from all sources
    const allDocuments: any[] = [];
    for (const client of this.apiClients) {
      try {
        const docs = await client.fetchDocuments({ limit: 10 });
        allDocuments.push(...docs);
      } catch (error) {
        this.logger.error('GenerateOfficeReport', `Failed to fetch from ${client.source}`, error);
      }
    }

    // Build sections based on available data
    const sections: ReportSection[] = [
      new ReportSection(
        '업무 개요',
        `총 ${allDocuments.length}건의 문서/데이터가 이번 기간 동안 처리되었습니다.`,
        { totalDocuments: allDocuments.length },
      ),
    ];

    // Generate AI summary
    const summaryPrompt = [
      `Generate a weekly report summary in Korean based on ${allDocuments.length} processed items.`,
      `Department: ${request.department || 'General'}`,
      `Period: ${period.toISOString().start} ~ ${period.toISOString().end}`,
      ``,
      `Focus on: overall productivity, key achievements, and areas for improvement.`,
    ].join('\n');

    const summary = await this.aiService.generateText(summaryPrompt, 'You are a business report writer.');

    let insights: string[] = [];
    if (request.includeInsights) {
      const insightText = await this.aiService.generateText(
        `Based on ${allDocuments.length} processed items, provide 3 key business insights in Korean.\nFormat each as a line starting with "- ".`,
      );
      insights = insightText.split('\n').filter(l => l.trim().startsWith('-')).map(l => l.trim().replace(/^-\s*/, ''));
    }

    return new OfficeReport(
      `${request.periodType === 'weekly' ? '주간' : request.periodType === 'monthly' ? '월간' : '업무'} 리포트`,
      request.periodType,
      period.start,
      period.end,
      sections,
      summary,
      {},
      insights,
    );
  }
}
