import { ILogger } from '../../domain/ports/ILogger.js';
import { CreateProductDescription } from '../../application/usecases/CreateProductDescription.js';
import { GenerateMarketingReport } from '../../application/usecases/GenerateMarketingReport.js';
import { SyncExternalData } from '../../application/usecases/SyncExternalData.js';
import { RunAutomationPipeline } from '../../application/usecases/RunAutomationPipeline.js';
import { CreateProductRequest } from '../../application/dto/CreateProductRequest.js';
import { ReportRequest } from '../../application/dto/PipelineRequest.js';
import { DateRange } from '../../domain/valueObjects/Types.js';

export interface CommandResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export class CliController {
  constructor(
    private readonly createProductDescription: CreateProductDescription,
    private readonly generateMarketingReport: GenerateMarketingReport,
    private readonly syncExternalData: SyncExternalData,
    private readonly runAutomationPipeline: RunAutomationPipeline,
    private readonly logger: ILogger,
  ) {}

  async handleDescribeProduct(args: {
    name: string;
    category: string;
    description: string;
    keywords: string[];
  }): Promise<CommandResult> {
    try {
      this.logger.info('CLI', 'describe-product', args);
      const request = new CreateProductRequest(
        args.name,
        args.category,
        args.description,
        args.keywords,
      );
      const result = await this.createProductDescription.execute(request);
      return {
        success: true,
        message: `✅ 상품 설명 생성 완료: ${args.name}`,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ 상품 설명 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async handleDailyReport(args: {
    platforms?: string[];
  }): Promise<CommandResult> {
    try {
      const request = new ReportRequest(
        DateRange.today(),
        args.platforms || ['cafe24', 'meta', 'naver'],
      );
      const { report } = await this.generateMarketingReport.execute(request);

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
    } catch (error) {
      return {
        success: false,
        message: `❌ 리포트 생성 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async handleSyncData(args: {
    sourcePlatform: string;
    targetPlatform: string;
  }): Promise<CommandResult> {
    try {
      const result = await this.syncExternalData.execute({
        sourcePlatform: args.sourcePlatform,
        targetPlatform: args.targetPlatform,
      });

      return {
        success: true,
        message: `✅ 데이터 동기화 완료: ${args.sourcePlatform} → ${args.targetPlatform}`,
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ 데이터 동기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  async handleRunPipeline(args: {
    name: string;
    steps: number;
  }): Promise<CommandResult> {
    try {
      const tasks = [];
      for (let i = 0; i < args.steps; i++) {
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

      const { pipeline } = await this.runAutomationPipeline.execute(args.name, tasks);

      return {
        success: true,
        message: `✅ 파이프라인 실행 완료: ${args.name} (${args.steps} steps)`,
        data: {
          pipelineId: pipeline.id,
          pipelineName: pipeline.name,
          status: pipeline.status,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ 파이프라인 실행 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ── 포맷팅 헬퍼 ──

  formatProductResult(data: unknown): string {
    const d = data as Record<string, unknown>;
    return `
📦 **상품 설명 생성 완료**
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
📊 **마케팅 리포트**
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
