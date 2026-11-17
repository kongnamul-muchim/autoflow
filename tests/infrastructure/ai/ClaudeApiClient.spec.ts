import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeApiClient } from '../../../src/infrastructure/ai/ClaudeApiClient.js';
import { ILogger } from '../../../src/core/domain/ports/ILogger.js';
import { IConfigService, AppConfig } from '../../../src/core/domain/ports/IConfigService.js';

class TestLogger implements ILogger {
  level = 'debug' as any;
  messages: { level: string; msg: string }[] = [];
  debug(ctx: string, msg: string) { this.messages.push({ level: 'debug', msg: `[${ctx}] ${msg}` }); }
  info(ctx: string, msg: string) { this.messages.push({ level: 'info', msg: `[${ctx}] ${msg}` }); }
  warn(ctx: string, msg: string) { this.messages.push({ level: 'warn', msg: `[${ctx}] ${msg}` }); }
  error(ctx: string, msg: string) { this.messages.push({ level: 'error', msg: `[${ctx}] ${msg}` }); }
}

class TestConfig implements IConfigService {
  constructor(private apiKey: string = '') {}
  get(): AppConfig {
    return {
      nodeEnv: 'test',
      anthropicApiKey: this.apiKey,
      dataDir: './data',
      activeModule: 'commerce',
      apiKeys: {},
    };
  }
  getApiKey(_platform: string): string | undefined { return undefined; }
  isDevelopment(): boolean { return false; }
  isProduction(): boolean { return false; }
}

describe('ClaudeApiClient', () => {
  let logger: TestLogger;

  beforeEach(() => {
    logger = new TestLogger();
    // 테스트가 개발 셸의 환경변수에 끌려가지 않게 고정한다.
    // (키가 export 되어 있으면 조용히 실제 API 를 호출해 타임아웃난다)
    for (const key of [
      'AI_PROVIDER', 'AI_API_KEY', 'AI_BASE_URL', 'AI_MODEL',
      'DEEPSEEK_API_KEY', 'DEEPSEEK_API_BASE', 'DEEPSEEK_MODEL',
      'ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL', 'AUTOFLOW_MODEL',
    ]) {
      delete process.env[key];
    }
  });

  describe('generateText (Mock 모드)', () => {
    it('API 키가 없으면 Mock 응답을 반환한다', async () => {
      const config = new TestConfig('');
      const client = new ClaudeApiClient(logger, config.get());

      const result = await client.generateText('Test prompt');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('Mock 모드에서 경고 로그를 남긴다', async () => {
      const config = new TestConfig('');
      const client = new ClaudeApiClient(logger, config.get());

      await client.generateText('Test prompt');
      expect(logger.messages.some(m => m.level === 'warn' && m.msg.includes('No API key'))).toBe(true);
    });

    it('systemPrompt를 전달할 수 있다', async () => {
      const config = new TestConfig('');
      const client = new ClaudeApiClient(logger, config.get());

      const result = await client.generateText('Test prompt', 'You are a helpful assistant.');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('commerce 관련 프롬프트에 대해 적절한 Mock 응답을 반환한다', async () => {
      const config = new TestConfig('');
      const client = new ClaudeApiClient(logger, config.get());

      const result = await client.generateText(
        'Create compelling product content for a lipstick...',
        'You are an e-commerce product copywriter for a Korean beauty brand.',
      );
      expect(result).toContain('글로우 립스틱');
    });
  });
});
