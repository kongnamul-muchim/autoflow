/**
 * AI 프로바이더 결정은 이 파일 하나에서만 한다.
 *
 * 원칙: 프로바이더마다 변수명을 따로 두지 않는다. 변수는 3개로 고정하고,
 * 프로바이더별 기본 base URL / 모델은 아래 프리셋이 채운다.
 *
 *   AI_PROVIDER   어떤 제공자 (gemini, deepseek, anthropic, openai, ...)
 *   AI_API_KEY    그 제공자의 키
 *   AI_MODEL      모델명 (비우면 프리셋 기본값)
 *   AI_BASE_URL   게이트웨이/프록시를 쓸 때만 (비우면 프리셋 기본값)
 *
 * 예전 변수명(ANTHROPIC_API_KEY, DEEPSEEK_API_BASE ...)도 계속 읽는다.
 * 다만 "선언한 프로바이더와 실제 base 가 다르다" 는 상황을 조용히 넘기지 않고
 * warning 으로 드러낸다. 실제로 DEEPSEEK_API_BASE 에 Gemini 주소가 들어간 채
 * 4개월을 보낸 사례가 있었다.
 */

export type AiProtocol = 'anthropic' | 'openai';

export interface ProviderPreset {
  protocol: AiProtocol;
  baseUrl: string;
  model: string;
  /** 이 프로바이더의 정상 호스트 조각. base 가 여기 안 맞으면 경고한다. */
  hosts: string[];
  /** 예전 변수명. 새 이름이 없을 때만 사용. */
  legacyKey?: string;
  legacyBase?: string;
  legacyModel?: string;
}

export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  anthropic: {
    protocol: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514',
    hosts: ['anthropic.com'],
    legacyKey: 'ANTHROPIC_API_KEY',
    legacyBase: 'ANTHROPIC_BASE_URL',
    legacyModel: 'AUTOFLOW_MODEL',
  },
  openai: {
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hosts: ['openai.com'],
    legacyKey: 'OPENAI_API_KEY',
  },
  deepseek: {
    protocol: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    hosts: ['deepseek.com'],
    legacyKey: 'DEEPSEEK_API_KEY',
    legacyBase: 'DEEPSEEK_API_BASE',
    legacyModel: 'DEEPSEEK_MODEL',
  },
  gemini: {
    protocol: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    hosts: ['googleapis.com'],
    legacyKey: 'GEMINI_API_KEY',
    legacyModel: 'GEMINI_MODEL',
  },
  openrouter: {
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-2.5-flash',
    hosts: ['openrouter.ai'],
    legacyKey: 'OPENROUTER_API_KEY',
  },
  groq: {
    protocol: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    hosts: ['groq.com'],
    legacyKey: 'GROQ_API_KEY',
  },
  ollama: {
    protocol: 'openai',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.1',
    hosts: ['127.0.0.1', 'localhost'],
  },
};

export const DEFAULT_PROVIDER = 'anthropic';

export interface ResolvedProvider {
  id: string;
  protocol: AiProtocol;
  key: string;
  baseUrl: string;
  model: string;
  /** base/model/키를 어디서 읽었는지. 화면·로그에서 근거로 쓴다. */
  source: 'generic' | 'legacy' | 'default';
  warning?: string;
}

function pick(env: NodeJS.ProcessEnv, ...names: (string | undefined)[]): string {
  for (const name of names) {
    if (!name) continue;
    const value = (env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

/** AI_PROVIDER 가 없으면 어떤 키가 들어 있는지로 추론한다. */
export function inferProvider(env: NodeJS.ProcessEnv = process.env): string {
  const order = ['anthropic', 'openai', 'deepseek', 'gemini', 'openrouter', 'groq'];
  for (const id of order) {
    const preset = PROVIDER_PRESETS[id];
    if (preset.legacyKey && pick(env, preset.legacyKey)) return id;
  }
  return DEFAULT_PROVIDER;
}

/** 선언한 프로바이더와 base 호스트가 어긋나면 경고 문구를 만든다. */
function mismatchWarning(id: string, baseUrl: string): string | undefined {
  const preset = PROVIDER_PRESETS[id];
  if (!preset) return undefined;

  let host = '';
  try {
    host = new URL(baseUrl).hostname;
  } catch {
    return `AI_BASE_URL 값을 URL 로 읽을 수 없습니다: ${baseUrl}`;
  }

  if (preset.hosts.some((fragment) => host.includes(fragment))) return undefined;

  const owner = Object.entries(PROVIDER_PRESETS).find(([, p]) =>
    p.hosts.some((fragment) => host.includes(fragment)),
  );
  const ownerText = owner ? ` (이 주소는 ${owner[0]} 것 같습니다)` : '';
  return `AI_PROVIDER=${id} 인데 base host 가 ${host} 입니다${ownerText}`;
}

export function resolveProvider(
  env: NodeJS.ProcessEnv = process.env,
  configKey?: string,
): ResolvedProvider {
  const id = (env.AI_PROVIDER || '').trim().toLowerCase() || inferProvider(env);
  const preset = PROVIDER_PRESETS[id];

  if (!preset) {
    const known = Object.keys(PROVIDER_PRESETS).join(', ');
    return {
      id,
      protocol: 'openai',
      key: pick(env, 'AI_API_KEY'),
      baseUrl: pick(env, 'AI_BASE_URL') || '',
      model: pick(env, 'AI_MODEL') || '',
      source: 'generic',
      warning: `모르는 프로바이더입니다: ${id} (가능: ${known}). AI_BASE_URL 을 직접 지정하세요.`,
    };
  }

  const genericKey = pick(env, 'AI_API_KEY');
  const legacyKey = pick(env, preset.legacyKey);
  const configFallback = id === 'anthropic' ? (configKey || '').trim() : '';
  const key = genericKey || legacyKey || configFallback;
  const source: ResolvedProvider['source'] = genericKey ? 'generic' : legacyKey || configFallback ? 'legacy' : 'default';

  const genericBase = pick(env, 'AI_BASE_URL');
  const legacyBase = pick(env, preset.legacyBase);
  const baseUrl = (genericBase || legacyBase || preset.baseUrl).replace(/\/+$/, '');

  const model = pick(env, 'AI_MODEL', preset.legacyModel) || preset.model;

  const warnings: string[] = [];
  const mismatch = mismatchWarning(id, baseUrl);
  if (mismatch) warnings.push(mismatch);

  if (!key) {
    const otherWithKey = Object.keys(PROVIDER_PRESETS).find(
      (other) => other !== id && PROVIDER_PRESETS[other].legacyKey && pick(env, PROVIDER_PRESETS[other].legacyKey),
    );
    if (otherWithKey) {
      warnings.push(`AI_PROVIDER=${id} 의 키가 없습니다. ${otherWithKey} 키는 들어 있습니다.`);
    }
  }

  return {
    id,
    protocol: preset.protocol,
    key,
    baseUrl,
    model,
    source,
    warning: warnings.length ? warnings.join(' / ') : undefined,
  };
}

/** base 에 버전 경로가 이미 있으면 그대로, 없으면 붙인다. */
export function buildEndpoint(resolved: Pick<ResolvedProvider, 'protocol' | 'baseUrl'>): string {
  const base = resolved.baseUrl.replace(/\/+$/, '');
  if (resolved.protocol === 'anthropic') return `${base}/v1/messages`;
  return /\/(v\d+[a-z0-9]*|openai)$/i.test(base) ? `${base}/chat/completions` : `${base}/v1/chat/completions`;
}
