import * as crypto from 'node:crypto';
import { ILogger } from '../../../../core/domain/ports/ILogger.js';
import { IAiService } from '../../../../core/domain/ports/IAiService.js';
import { DateRange } from '../../../../core/domain/valueObjects/Types.js';
import { IExternalApiClient } from '../../domain/ports/IExternalApiClient.js';
import { MarketingMetrics, Report } from '../../domain/valueObjects/MarketingMetrics.js';
import { ReportRequest } from '../dto/PipelineRequest.js';

export class GenerateMarketingReport {
  constructor(
    private readonly apiClients: IExternalApiClient[],
    private readonly aiService: IAiService,
    private readonly logger: ILogger,
  ) {}

  async execute(request: ReportRequest): Promise<Report> {
    this.logger.info('GenerateMarketingReport', 'Starting report generation', {
      platforms: request.platforms,
      period: request.period.toISOString(),
    });

    const allMetrics: MarketingMetrics[] = [];

    for (const client of this.apiClients) {
      if (request.platforms.includes(client.platform) || request.platforms.length === 0) {
        try {
          const metrics = await client.fetchMarketingMetrics(request.period);
          allMetrics.push(...metrics);
        } catch (error) {
          this.logger.error('GenerateMarketingReport', `Failed to fetch from ${client.platform}`, error);
        }
      }
    }

    const metricsText = allMetrics.map(m => {
      return [
        `[${m.source.toUpperCase()}]`,
        `  Impressions: ${m.impressions.toLocaleString()}`,
        `  Clicks: ${m.clicks.toLocaleString()}`,
        `  Conversions: ${m.conversions.toLocaleString()}`,
        `  Cost: \u20A9${m.cost.toLocaleString()}`,
        `  Revenue: \u20A9${m.revenue.toLocaleString()}`,
        `  CTR: ${m.ctr.toFixed(2)}%`,
        `  CVR: ${m.conversionRate.toFixed(2)}%`,
        `  ROAS: ${m.roas.toFixed(2)}`,
      ].join('\n');
    }).join('\n\n');

    const summary = await this.aiService.generateText(
      [
        'Analyze the following marketing performance data and write a concise executive summary in Korean (3-5 sentences).',
        '',
        metricsText,
        '',
        'Focus on: overall performance trends, channel comparisons, and actionable recommendations.',
      ].join('\n'),
      'You are a marketing analytics expert.',
    );

    let insights: string[] = [];
    if (request.generateInsights) {
      const insightText = await this.aiService.generateText(
        `Context: marketing\n\nData: ${JSON.stringify(allMetrics, null, 2)}\n\nAnalyze the above data and provide 3-5 key insights. Format each insight as a separate line starting with "- ".`,
      );
      insights = insightText.split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().replace(/^-\s*/, ''));
    }

    const report = new Report(
      `\uB9C8\uCF00\uD305 \uC131\uACFC \uB9AC\uD3EC\uD2B8 (${request.period.start.toLocaleDateString('ko-KR')} ~ ${request.period.end.toLocaleDateString('ko-KR')})`,
      summary,
      allMetrics,
      insights,
    );

    this.logger.info('GenerateMarketingReport', 'Report generated successfully', {
      metricCount: allMetrics.length,
      totalRevenue: report.totalRevenue,
    });

    return report;
  }
}
