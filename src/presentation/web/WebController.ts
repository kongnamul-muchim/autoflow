import { ILogger } from '../../core/domain/ports/ILogger.js';
import { IAutoFlowModule } from '../../core/application/IAutoFlowModule.js';
import { RunAutomationPipeline } from '../../core/application/usecases/RunAutomationPipeline.js';
import { TaskHandlerRegistry } from '../../core/application/TaskHandlerRegistry.js';
import { ITaskRepository } from '../../core/domain/ports/IRepository.js';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export class WebController {
  constructor(
    private readonly module: IAutoFlowModule,
    private readonly registry: TaskHandlerRegistry,
    private readonly runAutomationPipeline: RunAutomationPipeline,
    private readonly taskRepo: ITaskRepository,
    private readonly logger: ILogger,
  ) {}

  async describeProduct(params: {
    name: string;
    category: string;
    description?: string;
    keywords?: string | string[];
    audience?: string;
    tone?: string;
  }): Promise<ApiResponse> {
    try {
      const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
      if (!useCases?.createProductDescription) {
        return { success: false, message: `Module "${this.module.name}" does not support this operation.` };
      }
      const { CreateProductRequest } = await import('../../modules/commerce/application/dto/CreateProductRequest.js');
      const keywords = Array.isArray(params.keywords)
        ? params.keywords
        : params.keywords
          ? params.keywords.split(',').map((s: string) => s.trim())
          : [];
      const request = new CreateProductRequest(
        params.name,
        params.category,
        params.description || '',
        keywords,
        params.audience,
        params.tone,
      );
      const result = await (useCases.createProductDescription as any).execute(request);
      return { success: true, message: `✅ 상품 설명 생성 완료: ${params.name}`, data: result.data };
    } catch (error) {
      return { success: false, message: `❌ 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  }

  async generateReport(params: { platforms?: string }): Promise<ApiResponse> {
    try {
      const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
      if (!useCases?.generateMarketingReport) {
        return { success: false, message: `Module "${this.module.name}" does not support this operation.` };
      }
      const { ReportRequest } = await import('../../modules/commerce/application/dto/PipelineRequest.js');
      const { DateRange } = await import('../../core/domain/valueObjects/Types.js');
      const platforms = params.platforms ? params.platforms.split(',').map(s => s.trim()) : ['cafe24', 'meta', 'naver'];
      const request = new ReportRequest(DateRange.today(), platforms);
      const report = await (useCases.generateMarketingReport as any).execute(request);
      return {
        success: true, message: '✅ 마케팅 리포트 생성 완료',
        data: {
          title: report.title, summary: report.summary, metricsCount: report.metrics.length,
          totalRevenue: report.totalRevenue, totalCost: report.totalCost, roas: report.overallRoas, insights: report.insights,
        },
      };
    } catch (error) {
      return { success: false, message: `❌ 리포트 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  }

  async syncData(params: { source: string; target: string }): Promise<ApiResponse> {
    try {
      const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
      if (!useCases?.syncExternalData) {
        return { success: false, message: `Module "${this.module.name}" does not support this operation.` };
      }
      const result = await (useCases.syncExternalData as any).execute({
        sourcePlatform: params.source, targetPlatform: params.target,
      });
      return { success: true, message: `✅ 데이터 동기화 완료: ${params.source} → ${params.target}`, data: result.data };
    } catch (error) {
      return { success: false, message: `❌ 동기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  }

  async runPipeline(params: { name: string; steps: number }): Promise<ApiResponse> {
    try {
      const types = this.registry.getAllTypes();
      const tasks = [];
      for (let i = 0; i < params.steps; i++) {
        tasks.push({ type: types[i % types.length], config: { name: `${params.name}_step_${i + 1}` } });
      }
      const { pipeline } = await this.runAutomationPipeline.execute(params.name, tasks);
      return {
        success: true, message: `✅ 파이프라인 실행 완료: ${params.name} (${params.steps} steps)`,
        data: { pipelineId: pipeline.id, pipelineName: pipeline.name, status: pipeline.status },
      };
    } catch (error) {
      return { success: false, message: `❌ 파이프라인 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  }

  async getModuleInfo(): Promise<ApiResponse> {
    return {
      success: true,
      message: `AutoFlow — ${this.module.label} Module`,
      data: {
        module: this.module.name,
        description: this.module.description,
        taskTypes: this.registry.getAllTypes(),
      },
    };
  }

  // ── Office Module Web Methods ──

  async summarizeDocument(params: {
    title: string; content: string; type?: string; author?: string;
  }): Promise<ApiResponse> {
    try {
      const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
      if (!useCases?.summarizeDocument) {
        return { success: false, message: `Module "${this.module.name}" does not support this operation.` };
      }
      const { SummarizeRequest } = await import('../../modules/office/application/dto/DocumentRequest.js');
      const req = new SummarizeRequest(params.title, params.content, params.type || 'other', params.author);
      const result = await (useCases.summarizeDocument as any).execute(req);
      return {
        success: true, message: `✅ 문서 요약 완료: ${result.title}`,
        data: { title: result.title, summary: result.summary, keyPoints: result.keyPoints, actionItems: result.actionItems },
      };
    } catch (error) {
      return { success: false, message: `❌ 요약 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  }

  async generateOfficeReport(params: {
    periodType: string; department?: string;
  }): Promise<ApiResponse> {
    try {
      const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
      if (!useCases?.generateOfficeReport) {
        return { success: false, message: `Module "${this.module.name}" does not support this operation.` };
      }
      const { ReportRequest } = await import('../../modules/office/application/dto/DocumentRequest.js');
      const req = new ReportRequest(params.periodType as any, params.department);
      const report = await (useCases.generateOfficeReport as any).execute(req);
      return {
        success: true, message: `✅ ${report.title} 생성 완료`,
        data: {
          title: report.title, summary: report.summary, sectionCount: report.totalSections,
          insights: report.insights, periodStart: report.periodStart, periodEnd: report.periodEnd,
        },
      };
    } catch (error) {
      return { success: false, message: `❌ 리포트 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  }

  async batchDataEntry(params: {
    source: string; records: Array<Record<string, string>>;
  }): Promise<ApiResponse> {
    try {
      const useCases = this.module.getUseCases?.({ taskRepo: this.taskRepo, logger: this.logger });
      if (!useCases?.batchDataEntry) {
        return { success: false, message: `Module "${this.module.name}" does not support this operation.` };
      }
      const { DataEntryRequest } = await import('../../modules/office/application/dto/DocumentRequest.js');
      const req = new DataEntryRequest(params.source, params.records);
      const result = await (useCases.batchDataEntry as any).execute(req);
      return {
        success: true, message: `✅ 배치 데이터 입력 완료: ${result.successCount}/${result.totalCount} 성공`,
        data: { totalCount: result.totalCount, successCount: result.successCount, errorCount: result.errorCount, errors: result.errors, totalTime: result.totalTime },
      };
    } catch (error) {
      return { success: false, message: `❌ 데이터 입력 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}` };
    }
  }
}
