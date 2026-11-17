import { describe, it, expect } from 'vitest';
import {
  resolveProvider,
  inferProvider,
  buildEndpoint,
  PROVIDER_PRESETS,
} from '../../../src/infrastructure/ai/providerPresets.js';

const env = (values: Record<string, string>): NodeJS.ProcessEnv => ({ ...values }) as NodeJS.ProcessEnv;

describe('resolveProvider', () => {
  it('AI_PROVIDER 만 주면 프리셋의 base·모델을 채운다', () => {
    const r = resolveProvider(env({ AI_PROVIDER: 'gemini', AI_API_KEY: 'k' }));
    expect(r.id).toBe('gemini');
    expect(r.protocol).toBe('openai');
    expect(r.baseUrl).toBe('https://generativelanguage.googleapis.com/v1beta/openai');
    expect(r.model).toBe('gemini-2.5-flash');
    expect(r.warning).toBeUndefined();
  });

  it('AI_MODEL 이 있으면 프리셋 모델을 덮어쓴다', () => {
    const r = resolveProvider(env({ AI_PROVIDER: 'deepseek', AI_API_KEY: 'k', AI_MODEL: 'deepseek-reasoner' }));
    expect(r.model).toBe('deepseek-reasoner');
  });

  it('선언한 프로바이더와 base 호스트가 어긋나면 경고한다', () => {
    // 실제로 있었던 사고: DEEPSEEK_API_BASE 에 Gemini 주소가 들어 있었다.
    const r = resolveProvider(env({
      AI_PROVIDER: 'deepseek',
      DEEPSEEK_API_KEY: 'k',
      DEEPSEEK_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    }));
    expect(r.warning).toBeTruthy();
    expect(r.warning).toContain('deepseek');
    expect(r.warning).toContain('googleapis');
  });

  it('키가 없는데 다른 프로바이더 키만 있으면 알려준다', () => {
    const r = resolveProvider(env({ AI_PROVIDER: 'deepseek', GEMINI_API_KEY: 'k' }));
    expect(r.key).toBe('');
    expect(r.warning).toContain('deepseek');
  });

  it('예전 변수명도 계속 읽고 source 를 legacy 로 남긴다', () => {
    const r = resolveProvider(env({ ANTHROPIC_API_KEY: 'k' }), '');
    expect(r.id).toBe('anthropic');
    expect(r.key).toBe('k');
    expect(r.source).toBe('legacy');
  });

  it('새 변수명이 우선이다', () => {
    const r = resolveProvider(env({ AI_PROVIDER: 'anthropic', AI_API_KEY: 'new', ANTHROPIC_API_KEY: 'old' }));
    expect(r.key).toBe('new');
    expect(r.source).toBe('generic');
  });

  it('모르는 프로바이더는 경고하고 AI_BASE_URL 을 쓰게 한다', () => {
    const r = resolveProvider(env({ AI_PROVIDER: 'my-gateway', AI_API_KEY: 'k', AI_BASE_URL: 'https://gw.example.com/v1' }));
    expect(r.warning).toContain('my-gateway');
    expect(r.baseUrl).toBe('https://gw.example.com/v1');
  });

  it('아무 것도 없으면 anthropic 프리셋 + 키 없음', () => {
    const r = resolveProvider(env({}));
    expect(r.id).toBe('anthropic');
    expect(r.key).toBe('');
  });
});

describe('inferProvider', () => {
  it('키가 하나뿐이면 그 프로바이더로 추론한다', () => {
    expect(inferProvider(env({ DEEPSEEK_API_KEY: 'k' }))).toBe('deepseek');
    expect(inferProvider(env({ GEMINI_API_KEY: 'k' }))).toBe('gemini');
  });

  it('아무 키도 없으면 anthropic', () => {
    expect(inferProvider(env({}))).toBe('anthropic');
  });
});

describe('buildEndpoint', () => {
  it('anthropic 은 /v1/messages', () => {
    expect(buildEndpoint({ protocol: 'anthropic', baseUrl: 'https://api.anthropic.com' }))
      .toBe('https://api.anthropic.com/v1/messages');
  });

  it('버전이 없는 base 에는 /v1 을 붙인다', () => {
    expect(buildEndpoint({ protocol: 'openai', baseUrl: 'https://api.deepseek.com' }))
      .toBe('https://api.deepseek.com/v1/chat/completions');
  });

  it('버전이 이미 있으면 그대로 쓴다', () => {
    expect(buildEndpoint({ protocol: 'openai', baseUrl: 'https://api.openai.com/v1' }))
      .toBe('https://api.openai.com/v1/chat/completions');
    expect(buildEndpoint({ protocol: 'openai', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' }))
      .toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  });

  it('끝 슬래시가 중복되지 않는다', () => {
    expect(buildEndpoint({ protocol: 'openai', baseUrl: 'http://127.0.0.1:11434/v1/' }))
      .toBe('http://127.0.0.1:11434/v1/chat/completions');
  });
});

describe('PROVIDER_PRESETS', () => {
  it('모든 프리셋이 protocol/base/model 을 갖고 있다', () => {
    for (const [id, preset] of Object.entries(PROVIDER_PRESETS)) {
      expect(preset.protocol, id).toMatch(/^(anthropic|openai)$/);
      expect(preset.baseUrl, id).toMatch(/^https?:\/\//);
      expect(preset.model.length, id).toBeGreaterThan(0);
      expect(preset.hosts.length, id).toBeGreaterThan(0);
    }
  });
});
