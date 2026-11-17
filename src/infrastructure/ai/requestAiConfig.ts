import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * 방문자가 "자기 키"로 테스트할 때 쓰는 요청 단위 설정.
 *
 * 왜 전역 상태로 두지 않는가: 서버에 키를 저장하지 않고, 요청이 끝나면 사라져야 한다.
 * 동시에 여러 사람이 서로 다른 키로 호출해도 섞이지 않아야 한다. → AsyncLocalStorage.
 *
 * base URL 은 일부러 여기 없다. 클라이언트가 base 를 지정할 수 있으면 서버가 그 주소로
 * 요청을 보내는 SSRF 통로가 된다(169.254.169.254 같은 내부 주소). base 는 서버 env 만 신뢰한다.
 */
export interface AiOverride {
  key: string;
  provider?: string;
  model?: string;
}

const storage = new AsyncLocalStorage<AiOverride>();

export function runWithAiOverride<T>(override: AiOverride, fn: () => T): T {
  return storage.run(override, fn);
}

export function currentAiOverride(): AiOverride | undefined {
  return storage.getStore();
}

/** 로그·에러 메시지에 키가 섞여 나가지 않도록 마지막 4자만 남긴다. */
export function maskKey(key: string): string {
  if (!key) return '(none)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}
