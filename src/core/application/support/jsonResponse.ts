/**
 * LLM 응답에서 JSON 객체를 최대한 건져낸다.
 *
 * 실제 모델은 JSON 만 달랑 주지 않는다. ```json 펜스로 감싸거나, 앞뒤에 설명을 붙이거나,
 * 문자열 안에 중괄호가 들어간 채로 준다. mock 응답은 항상 깨끗한 JSON 이라 이 경로가
 * 검증되지 않은 채 남아 있기 쉽다. 파싱 실패는 조용히 기본값으로 떨어지므로 눈에 띄지 않는다.
 */
export function parseJsonObject<T>(raw: string): T | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  const candidates: string[] = [trimmed];

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) candidates.push(fence[1].trim());

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) candidates.push(trimmed.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const value: unknown = JSON.parse(candidate);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as T;
      }
    } catch {
      // 다음 후보를 시도한다
    }
  }
  return null;
}

/** 모델이 배열 대신 쉼표·줄바꿈 문자열로 줄 때도 배열로 받아준다. */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim().replace(/^[-•*]\s*/, ''))
      .filter((item) => item.length > 0);
  }
  return [];
}
