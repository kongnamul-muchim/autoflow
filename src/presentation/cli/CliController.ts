import { ILogger } from '../../core/domain/ports/ILogger.js';
import { IAutoFlowModule } from '../../core/application/IAutoFlowModule.js';
import { RunAutomationPipeline } from '../../core/application/usecases/RunAutomationPipeline.js';
import { TaskHandlerRegistry } from '../../core/application/TaskHandlerRegistry.js';
import { ITaskRepository, IPipelineRepository } from '../../core/domain/ports/IRepository.js';
import { DateRange } from '../../core/domain/valueObjects/Types.js';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export class CliController {
  constructor(
    private readonly module: IAutoFlowModule,
    private readonly registry: TaskHandlerRegistry,
    private readonly runAutomationPipeline: RunAutomationPipeline,
    private readonly taskRepo: ITaskRepository,
    private readonly pipelineRepo: IPipelineRepository,
    private readonly logger: ILogger,
  ) {}

  async handleDescribeProduct(args: {
    name: string;
    category: string;
    description: string;
    keywords: string[];
  }): Promise<CommandResult> {
    const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
    if (!useCases?.createProductDescription) {
      return { success: false, message: `Module "${this.module.name}" does not support product description.` };
    }
    const CreateProductRequest = (await import('../../modules/commerce/application/dto/CreateProductRequest.js')).CreateProductRequest;
    const req = new CreateProductRequest(args.name, args.category, args.description, args.keywords);
    const result = await (useCases.createProductDescription as any).execute(req);
    return {
      success: true,
      message: `✅ 상품 설명 생성 완료: ${args.name}`,
      data: result.data,
    };
  }

  async handleDailyReport(args: { platforms?: string[] }): Promise<CommandResult> {
    const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
    if (!useCases?.generateMarketingReport) {
      return { success: false, message: `Module "${this.module.name}" does not support marketing reports.` };
    }
    const ReportRequest = (await import('../../modules/commerce/application/dto/PipelineRequest.js')).ReportRequest;
    const req = new ReportRequest(DateRange.today(), args.platforms || ['cafe24', 'meta', 'naver']);
    const report = await (useCases.generateMarketingReport as any).execute(req);
    return {
      success: true,
      message: `✅ 마케팅 리포트 생성 완료`,
      data: {
        title: report.title,
        summary: report.summary,
        metricsCount: report.metrics.length,
        totalRevenue: report.totalRevenue,
        totalCost: report.totalCost,
        roas: report.overallRoas,
        insights: report.insights,
      },
    };
  }

  async handleSyncData(args: { sourcePlatform: string; targetPlatform: string }): Promise<CommandResult> {
    const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
    if (!useCases?.syncExternalData) {
      return { success: false, message: `Module "${this.module.name}" does not support data sync.` };
    }
    const result = await (useCases.syncExternalData as any).execute({
      sourcePlatform: args.sourcePlatform,
      targetPlatform: args.targetPlatform,
    });
    return {
      success: true,
      message: `✅ 데이터 동기화 완료: ${args.sourcePlatform} → ${args.targetPlatform}`,
      data: result.data,
    };
  }

  async handleRunPipeline(args: { name: string; steps: number }): Promise<CommandResult> {
    try {
      const types = this.registry.getAllTypes();
      const tasks = [];
      for (let i = 0; i < args.steps; i++) {
        const type = types[i % types.length];
        tasks.push({
          type,
          config: { name: `파이프라인_작업_${i + 1}` },
        });
      }
      const { pipeline } = await this.runAutomationPipeline.execute(args.name, tasks);
      return {
        success: true,
        message: `✅ 파이프라인 실행 완료: ${args.name} (${args.steps} steps)`,
        data: { pipelineId: pipeline.id, pipelineName: pipeline.name, status: pipeline.status },
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ 파이프라인 실행 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async handleList(type: string): Promise<string> {
    if (type === 'tasks') {
      const tasks = await this.taskRepo.findAll();
      if (tasks.length === 0) return '저장된 태스크가 없습니다.';
      let output = `📋 태스크 목록 (${tasks.length}개)\n`;
      for (const task of tasks) {
        output += `  [${task.status}] ${task.name} (${task.type}) - ${task.createdAt.toISOString()}\n`;
      }
      return output;
    } else if (type === 'pipelines') {
      const pipelines = await this.pipelineRepo.findAll();
      if (pipelines.length === 0) return '저장된 파이프라인이 없습니다.';
      let output = `📋 파이프라인 목록 (${pipelines.length}개)\n`;
      for (const pipeline of pipelines) {
        output += `  [${pipeline.status}] ${pipeline.name}\n`;
      }
      return output;
    }
    return `Unknown list type: ${type}`;
  }

  async getModuleInfo(): Promise<string> {
    const types = this.registry.getAllTypes();
    let output = `\n🤖 AutoFlow — ${this.module.label} Module\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `${this.module.description}\n\n`;
    output += `등록된 태스크 타입: ${types.join(', ')}\n`;
    return output;
  }

  // ── Office Module Commands ──

  async handleSummarizeDocument(args: { title: string; content: string; type?: string; author?: string }): Promise<CommandResult> {
    const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
    if (!useCases?.summarizeDocument) {
      return { success: false, message: `Module "${this.module.name}" does not support document summarization.` };
    }
    const { SummarizeRequest } = await import('../../modules/office/application/dto/DocumentRequest.js');
    const req = new SummarizeRequest(args.title, args.content, args.type || 'other', args.author);
    const result = await (useCases.summarizeDocument as any).execute(req);
    return {
      success: true,
      message: `✅ 문서 요약 완료: ${result.title}`,
      data: { title: result.title, summary: result.summary, keyPoints: result.keyPoints, actionItems: result.actionItems },
    };
  }

  async handleWeeklyReport(args: { periodType: string; department?: string }): Promise<CommandResult> {
    const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
    if (!useCases?.generateOfficeReport) {
      return { success: false, message: `Module "${this.module.name}" does not support report generation.` };
    }
    const { ReportRequest } = await import('../../modules/office/application/dto/DocumentRequest.js');
    const req = new ReportRequest(args.periodType as any, args.department);
    const report = await (useCases.generateOfficeReport as any).execute(req);
    return {
      success: true,
      message: `✅ ${report.title} 생성 완료`,
      data: {
        title: report.title, summary: report.summary, sectionCount: report.totalSections,
        insights: report.insights, periodStart: report.periodStart, periodEnd: report.periodEnd,
      },
    };
  }

  async handleBatchEntry(args: { source: string; records: Array<Record<string, string>> }): Promise<CommandResult> {
    const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
    if (!useCases?.batchDataEntry) {
      return { success: false, message: `Module "${this.module.name}" does not support batch data entry.` };
    }
    const { DataEntryRequest } = await import('../../modules/office/application/dto/DocumentRequest.js');
    const req = new DataEntryRequest(args.source, args.records);
    const result = await (useCases.batchDataEntry as any).execute(req);
    return {
      success: true,
      message: `✅ 배치 데이터 입력 완료: ${result.successCount}/${result.totalCount} 성공`,
      data: { totalCount: result.totalCount, successCount: result.successCount, errorCount: result.errorCount, errors: result.errors, totalTime: result.totalTime },
    };
  }

  formatSummaryResult(data: unknown): string {
    const d = data as Record<string, unknown>;
    let output = `\n📄 **문서 요약**\n━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `📋 제목: ${d.title}\n`;
    output += `📝 요약: ${(d.summary as string)?.substring(0, 200)}...\n`;
    if ((d.keyPoints as string[])?.length) {
      output += `🔑 핵심 포인트:\n`;
      for (const kp of (d.keyPoints as string[])) {
        output += `   • ${kp}\n`;
      }
    }
    return output;
  }

  formatOfficeReportResult(data: unknown): string {
    const d = data as Record<string, unknown>;
    let output = `\n📊 **리포트**\n━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `📋 ${d.title}\n`;
    output += `📈 요약: ${(d.summary as string)?.substring(0, 150)}...\n`;
    if ((d.insights as string[])?.length) {
      output += `💡 인사이트:\n`;
      for (const ins of (d.insights as string[])) {
        output += `   • ${ins}\n`;
      }
    }
    return output;
  }

  formatProductResult(data: unknown): string {
    const d = data as Record<string, unknown>;
    return `
📦 **생성 완료**
━━━━━━━━━━━━━━━━━━━━━
🏷️  제목: ${d.generatedTitle}
📝 설명: ${(d.generatedDescription as string)?.substring(0, 100)}...
🔑 키워드: ${(d.keywords as string[])?.join(', ')}
💰 USP: ${(d.sellingPoints as string[])?.join(' | ')}
━━━━━━━━━━━━━━━━━━━━━`;
  }

  formatReportResult(data: unknown): string {
    const d = data as Record<string, unknown>;
    return `
📊 **리포트**
━━━━━━━━━━━━━━━━━━━━━
📋 ${d.title}
📈 요약: ${d.summary as string}
💰 총 매출: ₩${(d.totalRevenue as number)?.toLocaleString()}
💸 총 비용: ₩${(d.totalCost as number)?.toLocaleString()}
📊 ROAS: ${(d.roas as number)?.toFixed(2)}
💡 인사이트: ${(d.insights as string[])?.join('\n           ')}
━━━━━━━━━━━━━━━━━━━━━`;
  }
}
