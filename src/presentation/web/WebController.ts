import { ILogger } from '../../domain/ports/ILogger.js';
import { CreateProductDescription } from '../../application/usecases/CreateProductDescription.js';
import { GenerateMarketingReport } from '../../application/usecases/GenerateMarketingReport.js';
import { SyncExternalData } from '../../application/usecases/SyncExternalData.js';
import { RunAutomationPipeline } from '../../application/usecases/RunAutomationPipeline.js';
import { CreateProductRequest } from '../../application/dto/CreateProductRequest.js';
import { ReportRequest } from '../../application/dto/PipelineRequest.js';
import { DateRange } from '../../domain/valueObjects/Types.js';

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

export class WebController {
  constructor(
    private readonly createProductDescription: CreateProductDescription,
    private readonly generateMarketingReport: GenerateMarketingReport,
    private readonly syncExternalData: SyncExternalData,
    private readonly runAutomationPipeline: RunAutomationPipeline,
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
      this.logger.info('WebController', 'describe-product', params);
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
      const result = await this.createProductDescription.execute(request);
      return {
        success: true,
        message: `✅ 상품 설명 생성 완료: ${params.name}`,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      };
    }
  }

  async generateReport(params: {
    platforms?: string;
  }): Promise<ApiResponse> {
    try {
      const platforms = params.platforms
        ? params.platforms.split(',').map((s: string) => s.trim())
        : ['cafe24', 'meta', 'naver'];
      const request = new ReportRequest(DateRange.today(), platforms);
      const { report } = await this.generateMarketingReport.execute(request);
      return {
        success: true,
        message: '✅ 마케팅 리포트 생성 완료',
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
    } catch (error) {
      return {
        success: false,
        message: `❌ 리포트 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      };
    }
  }

  async syncData(params: {
    source: string;
    target: string;
  }): Promise<ApiResponse> {
    try {
      const result = await this.syncExternalData.execute({
        sourcePlatform: params.source,
        targetPlatform: params.target,
      });
      return {
        success: true,
        message: `✅ 데이터 동기화 완료: ${params.source} → ${params.target}`,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ 동기화 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      };
    }
  }

  async runPipeline(params: {
    name: string;
    steps: number;
  }): Promise<ApiResponse> {
    try {
      const tasks = [];
      for (let i = 0; i < params.steps; i++) {
        tasks.push({
          type: 'product_description' as const,
          config: {
            name: `파이프라인_상품_${i + 1}`,
            category: 'General',
            description: '파이프라인 자동 생성 테스트',
            keywords: 'test,auto,pipeline',
          },
        });
      }
      const { pipeline } = await this.runAutomationPipeline.execute(params.name, tasks);
      return {
        success: true,
        message: `✅ 파이프라인 실행 완료: ${params.name} (${params.steps} steps)`,
        data: {
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          status: pipeline.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ 파이프라인 실행 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
      };
    }
  }
}
