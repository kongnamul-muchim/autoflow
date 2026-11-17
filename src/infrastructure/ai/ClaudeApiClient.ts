import { IAiService } from '../../core/domain/ports/IAiService.js';
import { ILogger } from '../../core/domain/ports/ILogger.js';
import { AppConfig } from '../../core/domain/ports/IConfigService.js';

type ProviderKind = 'anthropic' | 'openai-compatible';

interface ResolvedProvider {
  kind: ProviderKind;
  name: string;
  key: string;
  baseUrl: string;
  model: string;
}

export class ClaudeApiClient implements IAiService {
  /** 마지막 실제 호출이 실패했는지. 키가 있어도 실패하면 degraded 로 알린다. */
  private lastFailed = false;

  constructor(
    private readonly logger: ILogger,
    private readonly config: AppConfig,
  ) {}

  /**
   * 프로바이더는 환경변수로만 결정된다. 코드는 건드리지 않는다.
   *  AI_PROVIDER=anthropic(기본)  ANTHROPIC_API_KEY · ANTHROPIC_BASE_URL · AUTOFLOW_MODEL
   *  AI_PROVIDER=deepseek          DEEPSEEK_API_KEY · DEEPSEEK_API_BASE · DEEPSEEK_MODEL
   *  AI_PROVIDER=openai            AI_API_KEY · AI_BASE_URL · AI_MODEL
   */
  private resolveProvider(): ResolvedProvider {
    const provider = (process.env.AI_PROVIDER || 'anthropic').toLowerCase();

    if (provider === 'deepseek') {
      return {
        kind: 'openai-compatible',
        name: 'deepseek',
        key: process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY || '',
        baseUrl: process.env.DEEPSEEK_API_BASE || process.env.AI_BASE_URL || 'https://api.deepseek.com',
        model: process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || 'deepseek-chat',
      };
    }

    if (provider === 'openai') {
      return {
        kind: 'openai-compatible',
        name: 'openai',
        key: process.env.AI_API_KEY || '',
        baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com',
        model: process.env.AI_MODEL || 'gpt-4o-mini',
      };
    }

    return {
      kind: 'anthropic',
      name: 'anthropic',
      key: this.config.anthropicApiKey || process.env.AI_API_KEY || '',
      baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      model: process.env.AUTOFLOW_MODEL || 'claude-sonnet-4-20250514',
    };
  }

  /** 키가 실제로 들어와 있는가. */
  isConfigured(): boolean {
    return this.resolveProvider().key !== '';
  }

  /** 지금 어떤 프로바이더로 붙어 있는지. /api/health 가 그대로 노출한다. */
  providerName(): string {
    return this.resolveProvider().name;
  }

  /**
   * 현재 모드.
   *  sample   — 키 없음. 고정 예시 데이터를 돌려준다.
   *  degraded — 키는 있는데 마지막 호출이 실패해 예시로 떨어졌다.
   *  live     — 키가 있고 실제 호출이 성공(또는 아직 실패 이력 없음).
   */
  aiStatus(): 'live' | 'sample' | 'degraded' {
    if (!this.isConfigured()) return 'sample';
    return this.lastFailed ? 'degraded' : 'live';
  }

  isLive(): boolean {
    return this.aiStatus() === 'live';
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const provider = this.resolveProvider();

    this.logger.info('ClaudeApiClient', 'Generating text', {
      provider: provider.name,
      model: provider.model,
      promptLength: prompt.length,
      hasSystemPrompt: !!systemPrompt,
    });

    if (!provider.key) {
      this.logger.warn('ClaudeApiClient', `No API key for provider "${provider.name}", using mock response`);
      return this.generateMockResponse(prompt);
    }

    try {
      const text = provider.kind === 'anthropic'
        ? await this.callAnthropic(provider, prompt, systemPrompt)
        : await this.callOpenAiCompatible(provider, prompt, systemPrompt);
      this.lastFailed = false;
      return text;
    } catch (error) {
      this.lastFailed = true;
      this.logger.error('ClaudeApiClient', 'API call failed, falling back to mock', error);
      return this.generateMockResponse(prompt);
    }
  }

  private async callAnthropic(provider: ResolvedProvider, prompt: string, systemPrompt?: string): Promise<string> {
    const body: Record<string, unknown> = {
      model: provider.model,
      max_tokens: 4096,
      messages: [{ role: 'user' as const, content: prompt }],
    };
    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { content?: Array<{ text?: string }> };
    const text = data.content?.[0]?.text;
    if (!text) {
      throw new Error('Anthropic API response has no text content');
    }
    return text;
  }

  private async callOpenAiCompatible(provider: ResolvedProvider, prompt: string, systemPrompt?: string): Promise<string> {
    const base = provider.baseUrl.replace(/\/$/, '');
    // base 가 이미 버전 경로까지 포함하면 그대로 쓰고, 아니면 /v1 을 붙인다.
    // 예) https://api.deepseek.com            → /v1/chat/completions
    //     https://.../v1beta/openai/          → /chat/completions  (Gemini 호환)
    //     http://127.0.0.1:8000/v1            → /chat/completions  (vLLM 등)
    const endpoint = /\/(v\d+[a-z0-9]*|openai)$/i.test(base)
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
    const messages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }];

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({ model: provider.model, messages, temperature: 0.7, max_tokens: 2048 }),
    });

    if (!response.ok) {
      throw new Error(`${provider.name} API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error(`${provider.name} API response has no text content`);
    }
    return text;
  }

  private generateMockResponse(prompt: string): string {
    // Generic mock: detect intent from prompt keywords
    if (prompt.includes('product copywriter') || prompt.includes('product content')) {
      return JSON.stringify({
        title: '글로우 립스틱',
        description: '선명한 발색과 촉촉한 글로우 마무리감이 매력적인 립스틱입니다. 한 번 바르면 오래 지속되는 컬러와 영양감이 입술을 편안하게 감싸줍니다.',
        keywords: ['립스틱', '글로우', '발색력', '지속력', '보습'],
        sellingPoints: ['24시간 지속되는 발색', '촉촉한 글로우 마무리', '자연유래 성분 함유'],
        seoDescription: '선명한 발색과 글로우 마무리감의 프리미엄 립스틱. 24시간 지속력과 자연유래 성분으로 입술을 건강하게.',
      });
    }

    if (prompt.includes('marketing analytics') || prompt.includes('marketing performance')) {
      return '전체 광고 성과는 안정적인 수준을 유지하고 있습니다. Meta 채널이 가장 높은 ROAS를 기록하며 효율적인 광비 집행이 이루어지고 있습니다. 네이버 검색 광고는 브랜드 인지도 측면에서 꾸준한 기여를 하고 있으며, 전환율 개선을 위해 랜딩페이지 최적화를 검토할 필요가 있습니다.';
    }

    if (prompt.includes('문서') || prompt.includes('document') || prompt.includes('보고서')) {
      return JSON.stringify({
        summary: '요약: 본 문서는 프로젝트 진행 상황과 주요 이슈를 다루고 있습니다. 핵심 성과로는 일정 준수율 94%, 예산 집행률 87%를 기록했습니다.',
        keyPoints: ['일정 준수율 94% 달성', '예산 13% 절감', '리스크 3건 해소'],
        actionItems: ['다음 분기 계획 수립', '인력 보강 검토'],
      });
    }

    if (prompt.includes('데이터') || prompt.includes('data') || prompt.includes('entry') || prompt.includes('입력')) {
      return JSON.stringify({
        processedRecords: 42,
        successCount: 40,
        errorCount: 2,
        totalTime: '3.2초',
        status: 'completed',
      });
    }

    // Generic fallback
    return `분석 결과, 요청하신 작업이 완료되었습니다. 입력 데이터를 기반으로 최적의 결과를 생성했습니다.\n\n주요 내용:\n- 처리 완료: 정상적으로 실행되었습니다.\n- 품질: 기대 수준의 결과물이 생성되었습니다.\n- 권장사항: 필요에 따라 추가 설정을 검토하세요.`;
  }
}
