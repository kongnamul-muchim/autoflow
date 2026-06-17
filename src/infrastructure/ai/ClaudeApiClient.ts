import { IAiService } from '../../domain/ports/IAiService.js';
import { ProductContentRequest, ProductContentResult } from '../../domain/valueObjects/ProductData.js';
import { MarketingMetrics } from '../../domain/valueObjects/MarketingMetrics.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { AppConfig } from '../../domain/ports/IConfigService.js';

export class ClaudeApiClient implements IAiService {
  constructor(
    private readonly logger: ILogger,
    private readonly config: AppConfig,
  ) {}

  async generateProductContent(data: ProductContentRequest): Promise<ProductContentResult> {
    this.logger.info('ClaudeApiClient', 'Generating product content', { productName: data.name });

    const prompt = this.buildProductPrompt(data);
    const response = await this.callClaude(prompt);

    return this.parseProductContent(response);
  }

  async generateReportSummary(metrics: MarketingMetrics[]): Promise<string> {
    this.logger.info('ClaudeApiClient', 'Generating report summary', {
      metricCount: metrics.length,
    });

    const prompt = this.buildReportPrompt(metrics);
    const response = await this.callClaude(prompt);

    return response;
  }

  async generateInsights(data: unknown, context: string): Promise<string[]> {
    const prompt = `Context: ${context}\n\nData: ${JSON.stringify(data, null, 2)}\n\nAnalyze the above data and provide 3-5 key insights. Format each insight as a separate line starting with "- ".`;
    const response = await this.callClaude(prompt);

    return response
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.trim().replace(/^-\s*/, ''));
  }

  private buildProductPrompt(data: ProductContentRequest): string {
    return `You are an e-commerce product copywriter for a Korean beauty brand.

Create compelling product content for the following product:

Product Name: ${data.name}
Category: ${data.category}
Original Description: ${data.rawDescription}
Keywords: ${data.keywords.join(', ')}${data.targetAudience ? `\nTarget Audience: ${data.targetAudience}` : ''}${data.tone ? `\nTone: ${data.tone}` : ''}

Please provide:
1. An optimized product title (Korean, max 50 characters)
2. A compelling product description (Korean, 2-3 paragraphs)
3. 5-8 relevant keywords
4. 3 key selling points
5. An SEO-optimized meta description (Korean, max 150 characters)

Format your response as JSON:
{
  "title": "...",
  "description": "...",
  "keywords": ["...", "..."],
  "sellingPoints": ["...", "..."],
  "seoDescription": "..."
}`;
  }

  private buildReportPrompt(metrics: MarketingMetrics[]): string {
    const metricsText = metrics.map(m =>
      `[${m.source.toUpperCase()}]\n` +
      `  Impressions: ${m.impressions.toLocaleString()}\n` +
      `  Clicks: ${m.clicks.toLocaleString()}\n` +
      `  Conversions: ${m.conversions.toLocaleString()}\n` +
      `  Cost: ₩${m.cost.toLocaleString()}\n` +
      `  Revenue: ₩${m.revenue.toLocaleString()}\n` +
      `  CTR: ${m.ctr.toFixed(2)}%\n` +
      `  CVR: ${m.conversionRate.toFixed(2)}%\n` +
      `  ROAS: ${m.roas.toFixed(2)}\n`
    ).join('\n');

    return `You are a marketing analytics expert. Analyze the following marketing performance data and write a concise executive summary in Korean (3-5 sentences).

${metricsText}

Focus on: overall performance trends, channel comparisons, and actionable recommendations.`;
  }

  private async callClaude(prompt: string): Promise<string> {
    const apiKey = this.config.anthropicApiKey;

    if (!apiKey || apiKey === '') {
      this.logger.warn('ClaudeApiClient', 'No API key configured, using mock response');
      return this.generateMockResponse(prompt);
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { content: Array<{ text: string }> };
      return data.content[0].text;
    } catch (error) {
      this.logger.error('ClaudeApiClient', 'API call failed, falling back to mock', error);
      return this.generateMockResponse(prompt);
    }
  }

  private generateMockResponse(prompt: string): string {
    if (prompt.includes('product copywriter')) {
      return JSON.stringify({
        title: '글로우 립스틱',
        description: '선명한 발색과 촉촉한 글로우 마무리감이 매력적인 립스틱입니다. 한 번 바르면 오래 지속되는 컬러와 영양감이 입술을 편안하게 감싸줍니다.',
        keywords: ['립스틱', '글로우', '발색력', '지속력', '보습'],
        sellingPoints: ['24시간 지속되는 발색', '촉촉한 글로우 마무리', '자연유래 성분 함유'],
        seoDescription: '선명한 발색과 글로우 마무리감의 프리미엄 립스틱. 24시간 지속력과 자연유래 성분으로 입술을 건강하게.',
      });
    }

    if (prompt.includes('marketing analytics')) {
      return '전체 광고 성과는 안정적인 수준을 유지하고 있습니다. Meta 채널이 가장 높은 ROAS를 기록하며 효율적인 광비 집행이 이루어지고 있습니다. 네이버 검색 광고는 브랜드 인지도 측면에서 꾸준한 기여를 하고 있으며, 전환율 개선을 위해 랜딩페이지 최적화를 검토할 필요가 있습니다.';
    }

    return '분석 결과, 데이터에 기반한 인사이트가 도출되었습니다.';
  }

  private parseProductContent(response: string): ProductContentResult {
    try {
      const parsed = JSON.parse(response);
      return new ProductContentResult(
        parsed.title || '',
        parsed.description || '',
        parsed.keywords || [],
        parsed.sellingPoints || [],
        parsed.seoDescription || '',
        response,
      );
    } catch {
      return new ProductContentResult(
        '자동 생성 상품',
        response,
        [],
        [],
        response.substring(0, 150),
        response,
      );
    }
  }
}
