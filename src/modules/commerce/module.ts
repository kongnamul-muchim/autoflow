import { IAutoFlowModule } from '../../core/application/IAutoFlowModule.js';
import { TaskHandlerRegistry } from '../../core/application/TaskHandlerRegistry.js';
import { IAiService } from '../../core/domain/ports/IAiService.js';
import { ILogger } from '../../core/domain/ports/ILogger.js';
import { ITaskRepository } from '../../core/domain/ports/IRepository.js';
import { Task } from '../../core/domain/entities/Task.js';
import { TaskResult } from '../../core/domain/entities/Task.js';

import { CreateProductDescription } from './application/usecases/CreateProductDescription.js';
import { GenerateMarketingReport } from './application/usecases/GenerateMarketingReport.js';
import { SyncExternalData, SyncRequest } from './application/usecases/SyncExternalData.js';
import { CreateProductRequest } from './application/dto/CreateProductRequest.js';
import { ReportRequest } from './application/dto/PipelineRequest.js';
import { DateRange } from '../../core/domain/valueObjects/Types.js';

import { MockCafe24Client, MockMetaClient, MockNaverClient } from './infrastructure/api/MockClients.js';
import { IExternalApiClient } from './domain/ports/IExternalApiClient.js';

export class CommerceModule implements IAutoFlowModule {
  readonly name = 'commerce';
  readonly label = '이커머스';
  readonly description = 'AI 기반 이커머스 업무 자동화 — 상품 설명 생성, 마케팅 리포트, 데이터 동기화';

  private useCases!: {
    createProductDescription: CreateProductDescription;
    generateMarketingReport: GenerateMarketingReport;
    syncExternalData: SyncExternalData;
  };

  getUseCases(repos: { taskRepo: ITaskRepository; logger: ILogger }): Record<string, unknown> {
    return this.useCases;
  }

  registerHandlers(
    registry: TaskHandlerRegistry,
    aiService: IAiService,
    logger: ILogger,
    repos: { taskRepo: ITaskRepository },
  ): void {
    const apiClients: IExternalApiClient[] = [
      new MockCafe24Client(logger),
      new MockMetaClient(logger),
      new MockNaverClient(logger),
    ];

    const productDesc = new CreateProductDescription(aiService, repos.taskRepo, logger);
    const marketingReport = new GenerateMarketingReport(apiClients, aiService, logger);
    const dataSync = new SyncExternalData(apiClients, repos.taskRepo, logger);

    // Store use cases for CLI/Web direct access
    this.useCases = {
      createProductDescription: productDesc,
      generateMarketingReport: marketingReport,
      syncExternalData: dataSync,
    };

    registry.register({
      type: 'product_description',
      execute: async (task: Task, ai: IAiService, log: ILogger) => {
        const config = task.config as Record<string, string>;
        const req = new CreateProductRequest(
          config.name || 'Unknown Product',
          config.category || 'General',
          config.description || '',
          (config.keywords || '').split(',').filter(Boolean),
        );
        return await productDesc.execute(req);
      },
    });

    registry.register({
      type: 'marketing_report',
      execute: async (task: Task, ai: IAiService, log: ILogger) => {
        const reportUseCase = new GenerateMarketingReport(apiClients, ai, log);
        const cfg = task.config as Record<string, unknown>;
        const req = new ReportRequest(
          DateRange.today(),
          (cfg.platforms as string[]) || ['cafe24', 'meta', 'naver'],
        );
        const report = await reportUseCase.execute(req);
        return TaskResult.success(task.id, {
          reportTitle: report.title,
          metricsCount: report.metrics.length,
          totalRevenue: report.totalRevenue,
          totalCost: report.totalCost,
          roas: report.overallRoas,
          insights: report.insights,
        });
      },
    });

    registry.register({
      type: 'data_sync',
      execute: async (task: Task, ai: IAiService, log: ILogger) => {
        const syncUseCase = new SyncExternalData(apiClients, repos.taskRepo, log);
        const config = task.config as Record<string, string>;
        const req: SyncRequest = {
          sourcePlatform: config.sourcePlatform || config.source || 'cafe24',
          targetPlatform: config.targetPlatform || config.target || 'meta',
        };
        return await syncUseCase.execute(req);
      },
    });
  }
}
export default CommerceModule;
