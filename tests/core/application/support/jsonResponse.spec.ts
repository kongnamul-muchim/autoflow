import { describe, it, expect } from 'vitest';
import { parseJsonObject, toStringArray } from '../../../../src/core/application/support/jsonResponse.js';

describe('parseJsonObject', () => {
  it('깨끗한 JSON 을 그대로 파싱한다', () => {
    expect(parseJsonObject('{"title":"a"}')).toEqual({ title: 'a' });
  });

  it('```json 펜스로 감싼 응답을 파싱한다', () => {
    const raw = '```json\n{"title":"초경량 무선 청소기"}\n```';
    expect(parseJsonObject<{ title: string }>(raw)?.title).toBe('초경량 무선 청소기');
  });

  it('앞뒤에 설명이 붙어 있어도 객체를 건져낸다', () => {
    const raw = '아래는 결과입니다.\n{"title":"b","keywords":["x"]}\n참고하세요.';
    expect(parseJsonObject<{ title: string }>(raw)?.title).toBe('b');
  });

  it('JSON 이 없으면 null 을 돌려준다 (예외를 던지지 않는다)', () => {
    expect(parseJsonObject('그냥 문장입니다.')).toBeNull();
    expect(parseJsonObject('')).toBeNull();
  });
});

describe('toStringArray', () => {
  it('배열은 그대로 정리한다', () => {
    expect(toStringArray([' a ', 'b', ''])).toEqual(['a', 'b']);
  });

  it('쉼표·줄바꿈 문자열도 배열로 받는다', () => {
    expect(toStringArray('a, b\n- c')).toEqual(['a', 'b', 'c']);
  });

  it('숫자나 null 은 빈 배열', () => {
    expect(toStringArray(3)).toEqual([]);
    expect(toStringArray(null)).toEqual([]);
  });
});
