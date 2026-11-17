import { IAutoFlowModule } from '../../core/application/IAutoFlowModule.js';
import { TaskHandlerRegistry } from '../../core/application/TaskHandlerRegistry.js';
import { IAiService } from '../../core/domain/ports/IAiService.js';
import { ILogger } from '../../core/domain/ports/ILogger.js';
import { ITaskRepository } from '../../core/domain/ports/IRepository.js';
import { Task } from '../../core/domain/entities/Task.js';
import { TaskResult } from '../../core/domain/entities/Task.js';

import { SummarizeDocument } from './application/usecases/SummarizeDocument.js';
import { GenerateOfficeReport } from './application/usecases/GenerateOfficeReport.js';
import { BatchDataEntry } from './application/usecases/BatchDataEntry.js';
import { SummarizeRequest } from './application/dto/DocumentRequest.js';

import { MockErpClient, MockHrClient } from './infrastructure/api/MockOfficeClients.js';
import { IOfficeApiClient } from './domain/ports/IOfficeApiClient.js';

export class OfficeModule implements IAutoFlowModule {
  readonly name = 'office';
  readonly label = '사무자동화';
  readonly description = 'AI 기반 사무 자동화 — 문서 요약, 업무 리포트, 데이터 입력 자동화';

  private useCases!: {
    summarizeDocument: SummarizeDocument;
    generateOfficeReport: GenerateOfficeReport;
    batchDataEntry: BatchDataEntry;
  };

  getUseCases(_repos: { taskRepo: ITaskRepository; logger: ILogger }): Record<string, unknown> {
    return this.useCases;
  }

  registerHandlers(
    registry: TaskHandlerRegistry,
    aiService: IAiService,
    logger: ILogger,
    _repos: { taskRepo: ITaskRepository },
  ): void {
    const apiClients: IOfficeApiClient[] = [
      new MockErpClient(logger),
      new MockHrClient(logger),
    ];

    const summarizeDoc = new SummarizeDocument(aiService, logger);
    const generateReport = new GenerateOfficeReport(apiClients, aiService, logger);
    const batchEntry = new BatchDataEntry(aiService, logger);

    this.useCases = {
      summarizeDocument: summarizeDoc,
      generateOfficeReport: generateReport,
      batchDataEntry: batchEntry,
    };

    registry.register({
      type: 'document_summary',
      execute: async (task: Task, _ai: IAiService, log: ILogger) => {
        const config = task.config as Record<string, string>;
        const req = new SummarizeRequest(
          config.title || '제목 없음',
          config.content || '내용 없음',
          config.type || 'other',
          config.author,
        );
        const result = await summarizeDoc.execute(req);
        return TaskResult.success(task.id, {
          docId: result.documentId,
          title: result.title,
          summary: result.summary,
          keyPoints: result.keyPoints,
          actionItems: result.actionItems,
        });
      },
    });

    registry.register({
      type: 'report_generation',
      execute: async (task: Task, _ai: IAiService, log: ILogger) => {
        const { ReportRequest } = await import('./application/dto/DocumentRequest.js');
        const config = task.config as Record<string, string>;
        const req = new ReportRequest(
          (config.periodType as any) || 'weekly',
          config.department,
          config.includeInsights !== 'false',
        );
        const report = await generateReport.execute(req);
        return TaskResult.success(task.id, {
          reportTitle: report.title,
          sectionCount: report.totalSections,
          summary: report.summary,
          insights: report.insights,
        });
      },
    });

    registry.register({
      type: 'data_entry',
      execute: async (task: Task, _ai: IAiService, log: ILogger) => {
        const { DataEntryRequest } = await import('./application/dto/DocumentRequest.js');
        const config = task.config as Record<string, unknown>;
        const req = new DataEntryRequest(
          (config.source as string) || 'manual',
          (config.records as Array<Record<string, string>>) || [],
          config.validateOnly === true,
        );
        const result = await batchEntry.execute(req);
        return TaskResult.success(task.id, {
          totalCount: result.totalCount,
          successCount: result.successCount,
          errorCount: result.errorCount,
          errors: result.errors,
          totalTime: result.totalTime,
        });
      },
    });
  }
}
export default OfficeModule;
