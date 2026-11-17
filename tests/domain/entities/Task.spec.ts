import { describe, it, expect } from 'vitest';
import { Task, TaskResult } from '../../../src/core/domain/entities/Task.js';


describe('Task', () => {
  const validConfig: TaskConfig = { name: '테스트상품', category: '립메이크업' };

  it('기본값으로 Task를 생성한다', () => {
    const task = new Task('id-1', '테스트 태스크', 'product_description', validConfig);

    expect(task.id).toBe('id-1');
    expect(task.name).toBe('테스트 태스크');
    expect(task.type).toBe('product_description');
    expect(task.status).toBe('pending');
    expect(task.priority).toBe('medium');
    expect(task.createdAt).toBeInstanceOf(Date);
    expect(task.result).toBeNull();
    expect(task.isFinished).toBe(false);
  });

  it('우선순위를 지정하여 Task를 생성한다', () => {
    const task = new Task('id-2', '중요 태스크', 'marketing_report', validConfig, 'pending', 'high');
    expect(task.priority).toBe('high');
  });

  describe('상태 전환', () => {
    it('pending → running: start() 호출 시 상태가 running으로 변경된다', () => {
      const task = new Task('id-3', '실행 태스크', 'data_sync', validConfig);
      task.start();
      expect(task.status).toBe('running');
    });

    it('running → completed: complete() 호출 시 상태가 completed로 변경되고 결과가 저장된다', () => {
      const task = new Task('id-4', '완료 태스크', 'product_description', validConfig);
      task.start();
      const result = TaskResult.success('id-4', { message: '완료' });

      task.complete(result);

      expect(task.status).toBe('completed');
      expect(task.result).toBe(result);
      expect(task.isFinished).toBe(true);
    });

    it('running → failed: fail() 호출 시 상태가 failed로 변경된다', () => {
      const task = new Task('id-5', '실패 태스크', 'data_sync', validConfig);
      task.start();

      task.fail('API 연결 실패');

      expect(task.status).toBe('failed');
      expect(task.result).not.toBeNull();
      expect(task.result!.success).toBe(false);
      expect(task.result!.error).toBe('API 연결 실패');
      expect(task.isFinished).toBe(true);
    });

    it('pending 상태에서 complete() 호출 시 에러가 발생한다', () => {
      const task = new Task('id-6', '에러 태스크', 'pipeline', validConfig);
      const result = TaskResult.success('id-6', {});

      expect(() => task.complete(result)).toThrow('Cannot complete task');
      expect(task.status).toBe('pending');
    });

    it('completed 상태에서 start() 호출 시 에러가 발생한다', () => {
      const task = new Task('id-7', '이미완료', 'product_description', validConfig);
      task.start();
      task.complete(TaskResult.success('id-7', {}));

      expect(() => task.start()).toThrow('Cannot start task');
    });

    it('이미 실패한 태스크는 finished=true이다', () => {
      const task = new Task('id-8', '실패', 'data_sync', validConfig);
      task.start();
      task.fail('오류');

      expect(task.isFinished).toBe(true);
      expect(task.status).toBe('failed');
    });
  });

  describe('TaskResult', () => {
    it('static success(): 성공 결과를 생성한다', () => {
      const result = TaskResult.success('task-1', { done: true }, { durationMs: 150 });

      expect(result.taskId).toBe('task-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ done: true });
      expect(result.metrics).toEqual({ durationMs: 150 });
      expect(result.executedAt).toBeInstanceOf(Date);
      expect(result.error).toBeUndefined();
    });

    it('static failure(): 실패 결과를 생성한다', () => {
      const result = TaskResult.failure('task-2', '에러 발생');

      expect(result.taskId).toBe('task-2');
      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe('에러 발생');
    });

    it('duration(): metrics에 durationMs가 있으면 값을 반환한다', () => {
      const result = TaskResult.success('task-3', {}, { durationMs: 250 });
      expect(result.duration).toBe(250);
    });

    it('duration(): metrics가 없으면 null을 반환한다', () => {
      const result = TaskResult.success('task-4', {});
      expect(result.duration).toBeNull();
    });
  });

  describe('toJSON()', () => {
    it('Task를 직렬화 가능한 객체로 변환한다', () => {
      const task = new Task('id-10', 'JSON 테스트', 'product_description', { key: 'value' }, 'pending', 'medium', new Date('2026-01-01'));
      task.start();
      task.complete(TaskResult.success('id-10', { result: 'ok' }));

      const json = task.toJSON();

      expect(json.id).toBe('id-10');
      expect(json.name).toBe('JSON 테스트');
      expect(json.status).toBe('completed');
      expect(json.config).toEqual({ key: 'value' });
      expect(json.result).not.toBeNull();
      const r = json.result as { success: boolean };
      expect(r!.success).toBe(true);
    });
  });
});
