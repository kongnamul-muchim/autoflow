import { IAiService } from '../../domain/ports/IAiService.js';
import { IExternalApiClient } from '../../domain/ports/IExternalApiClient.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { Task } from '../../domain/entities/Task.js';
import { TaskResult } from '../../domain/entities/Task.js';
import { MarketingMetrics } from '../../domain/valueObjects/MarketingMetrics.js';
import { Report } from '../../domain/valueObjects/MarketingMetrics.js';
import { ReportRequest } from '../dto/PipelineRequest.js';
import { DateRange } from '../../domain/valueObjects/Types.js';
import * as crypto from 'node:crypto';

export class GenerateMarketingReport {
  constructor(
    private readonly apiClients: IExternalApiClient[],
    private readonly aiService: IAiService,
    private readonly logger: ILogger,
  ) {}

  async execute(request: ReportRequest): Promise<{ task: Task; report: Report }> {
    this.logger.info('GenerateMarketingReport', 'Starting report generation', {
      platforms: request.platforms,
      period: request.period.toISOString(),
    });

    const taskId = crypto.randomUUID();
    const task = new Task(
      taskId,
      `마케팅리포트_${request.period.start.toISOString().split('T')[0]}`,
      'marketing_report',
      { platforms: request.platforms, period: request.period },
    );

    try {
      task.start();
      const allMetrics: MarketingMetrics[] = [];

      // Collect metrics from all available API clients matching requested platforms
      for (const client of this.apiClients) {
        if (request.platforms.includes(client.platform) || request.platforms.length === 0) {
          try {
            const metrics = await client.fetchMarketingMetrics(request.period);
            allMetrics.push(...metrics);
            this.logger.info('GenerateMarketingReport', `Fetched ${metrics.length} metrics from ${client.platform}`);
          } catch (error) {
            this.logger.error('GenerateMarketingReport', `Failed to fetch from ${client.platform}`, error);
          }
        }
      }

      // Generate AI summary
      const summary = await this.aiService.generateReportSummary(allMetrics);

      // Generate AI insights if requested
      let insights: string[] = [];
      if (request.generateInsights) {
        insights = await this.aiService.generateInsights(allMetrics, 'marketing');
      }

      const report = new Report(
        `마케팅 성과 리포트 (${request.period.start.toLocaleDateString('ko-KR')} ~ ${request.period.end.toLocaleDateString('ko-KR')})`,
        summary,
        allMetrics,
        insights,
        [],
      );

      task.complete(TaskResult.success(taskId, {
        reportTitle: report.title,
        metricsCount: allMetrics.length,
        totalRevenue: report.totalRevenue,
        totalCost: report.totalCost,
        roas: report.overallRoas,
      }));

      this.logger.info('GenerateMarketingReport', 'Report generated successfully', {
        taskId,
        metricCount: allMetrics.length,
        totalRevenue: report.totalRevenue,
      });

      return { task, report };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      task.fail(message);
      this.logger.error('GenerateMarketingReport', 'Report generation failed', { error: message });
      throw error;
    }
  }
}
