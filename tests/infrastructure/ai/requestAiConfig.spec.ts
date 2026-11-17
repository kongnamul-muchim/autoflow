import { describe, it, expect } from 'vitest';
import { runWithAiOverride, currentAiOverride, maskKey } from '../../../src/infrastructure/ai/requestAiConfig.js';
import { resolveProvider } from '../../../src/infrastructure/ai/providerPresets.js';

describe('요청 단위 키 컨텍스트', () => {
  it('컨텍스트 밖에서는 비어 있다', () => {
    expect(currentAiOverride()).toBeUndefined();
  });

  it('컨텍스트 안에서만 보인다', async () => {
    const seen: (string | undefined)[] = [];
    await runWithAiOverride({ key: 'caller-key-1', provider: 'gemini' }, async () => {
      await Promise.resolve();
      seen.push(currentAiOverride()?.key);
    });
    seen.push(currentAiOverride()?.key);
    expect(seen).toEqual(['caller-key-1', undefined]);
  });

  it('동시 실행해도 섞이지 않는다', async () => {
    const run = (key: string, delay: number) =>
      runWithAiOverride({ key }, async () => {
        await new Promise((r) => setTimeout(r, delay));
        return currentAiOverride()?.key;
      });
    const [a, b] = await Promise.all([run('key-a', 20), run('key-b', 5)]);
    expect([a, b]).toEqual(['key-a', 'key-b']);
  });
});

describe('resolveProvider + 방문자 키', () => {
  it('키가 있으면 provider 는 방문자 선택, base 는 프리셋', () => {
    const r = resolveProvider({} as NodeJS.ProcessEnv, '', { key: 'visitor', provider: 'gemini' });
    expect(r.source).toBe('byok');
    expect(r.key).toBe('visitor');
    expect(r.protocol).toBe('openai');
    expect(r.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
  });

  it('서버 env 키가 있어도 방문자 키가 이긴다', () => {
    const r = resolveProvider(
      { AI_PROVIDER: 'anthropic', AI_API_KEY: 'server-key' } as NodeJS.ProcessEnv,
      '',
      { key: 'visitor', provider: 'deepseek' },
    );
    expect(r.key).toBe('visitor');
    expect(r.id).toBe('deepseek');
  });

  it('키가 없는 override 는 무시한다', () => {
    const r = resolveProvider({ AI_PROVIDER: 'gemini', AI_API_KEY: 'server' } as NodeJS.ProcessEnv, '', {
      key: '',
      provider: 'deepseek',
    });
    expect(r.source).toBe('generic');
    expect(r.key).toBe('server');
    expect(r.id).toBe('gemini');
  });

  it('모델은 방문자 지정 > env > 프리셋 순', () => {
    const base = { AI_PROVIDER: 'deepseek', AI_API_KEY: 'server', AI_MODEL: 'env-model' } as NodeJS.ProcessEnv;
    expect(resolveProvider(base, '', { key: 'v', model: 'visitor-model' }).model).toBe('visitor-model');
    expect(resolveProvider(base, '', { key: 'v' }).model).toBe('env-model');
  });

  it('base 는 방문자가 바꿀 수 없다 (SSRF 방지)', () => {
    const r = resolveProvider({} as NodeJS.ProcessEnv, '', { key: 'v', provider: 'deepseek' } as never);
    expect(r.baseUrl).toBe('https://api.deepseek.com/v1');
  });
});

describe('maskKey', () => {
  it('앞 3자와 뒤 4자만 남긴다', () => {
    expect(maskKey('sk-abcdefghijklmnop')).toBe('sk-****mnop');
  });
  it('짧은 키는 통째로 가린다', () => {
    expect(maskKey('short')).toBe('****');
    expect(maskKey('')).toBe('(none)');
  });
});
