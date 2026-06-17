import { describe, it, expect } from 'vitest';
import { Pipeline } from '../../../src/domain/entities/Pipeline.js';
import { Task } from '../../../src/domain/entities/Task.js';
import { CronExpression, NotificationConfig } from '../../../src/domain/valueObjects/Types.js';

describe('Pipeline', () => {
  const makeTask = (id: string, status: 'pending' | 'running' | 'completed' | 'failed' = 'pending') => {
    const task = new Task(id, `Task ${id}`, 'product_description', {});
    // skip state machine for setup
    if (status === 'running') { (task as any).status = 'running'; }
    if (status === 'completed') { (task as any).status = 'completed'; }
    if (status === 'failed') { (task as any).status = 'failed'; }
    return task;
  };

  it('하나 이상의 Task로 Pipeline을 생성한다', () => {
    const tasks = [makeTask('t1'), makeTask('t2')];
    const pipeline = new Pipeline('p-1', '테스트 파이프라인', tasks);

    expect(pipeline.id).toBe('p-1');
    expect(pipeline.name).toBe('테스트 파이프라인');
    expect(pipeline.tasks).toHaveLength(2);
    expect(pipeline.schedule).toBeUndefined();
    expect(pipeline.notifications).toEqual([]);
  });

  it('Task가 없으면 생성 시 에러가 발생한다', () => {
    expect(() => new Pipeline('p-2', '빈 파이프라인', [])).toThrow('at least one task');
  });

  it('스케줄과 알림을 지정하여 생성한다', () => {
    const cron = new CronExpression('0 9 * * *');
    const notif: NotificationConfig = { channel: 'slack', onSuccess: true, onFailure: true };
    const pipeline = new Pipeline('p-3', '스케줄 파이프라인', [makeTask('t1')], cron, [notif]);

    expect(pipeline.schedule?.expression).toBe('0 9 * * *');
    expect(pipeline.notifications).toHaveLength(1);
  });

  describe('status 계산', () => {
    it('모든 Task가 pending이면 status도 pending이다', () => {
      const pipeline = new Pipeline('p-4', '대기중', [makeTask('t1'), makeTask('t2')]);
      expect(pipeline.status).toBe('pending');
    });

    it('모든 Task가 completed면 status도 completed다', () => {
      const pipeline = new Pipeline('p-5', '완료', [makeTask('t1', 'completed'), makeTask('t2', 'completed')]);
      expect(pipeline.status).toBe('completed');
    });

    it('Task 중 하나라도 running이면 status도 running이다', () => {
      const pipeline = new Pipeline('p-6', '실행중', [makeTask('t1', 'completed'), makeTask('t2', 'running')]);
      expect(pipeline.status).toBe('running');
    });

    it('Task 중 하나라도 failed면 status도 failed다', () => {
      const pipeline = new Pipeline('p-7', '실패', [makeTask('t1', 'completed'), makeTask('t2', 'failed')]);
      expect(pipeline.status).toBe('failed');
    });

    it('running이 failed보다 우선한다', () => {
      const pipeline = new Pipeline('p-8', '부분실패', [makeTask('t1', 'running'), makeTask('t2', 'failed')]);
      expect(pipeline.status).toBe('running');
    });
  });

  describe('toJSON()', () => {
    it('Pipeline을 직렬화한다', () => {
      const pipeline = new Pipeline('p-9', 'JSON 테스트', [makeTask('t1', 'completed')], new CronExpression('@daily'));
      const json = pipeline.toJSON();

      expect(json.id).toBe('p-9');
      expect(json.name).toBe('JSON 테스트');
      expect(json.schedule).toBe('@daily');
      expect(json.status).toBe('completed');
    });
  });
});

describe('CronExpression', () => {
  it('유효한 cron 표현식을 생성한다', () => {
    const cron = new CronExpression('0 9 * * *');
    expect(cron.expression).toBe('0 9 * * *');
  });

  it('@daily, @hourly, @weekly 표현식을 지원한다', () => {
    expect(new CronExpression('@daily').expression).toBe('@daily');
    expect(new CronExpression('@hourly').expression).toBe('@hourly');
    expect(new CronExpression('@weekly').expression).toBe('@weekly');
  });

  it('유효하지 않은 표현식은 에러를 발생시킨다', () => {
    expect(() => new CronExpression('invalid')).toThrow('Invalid cron expression');
  });
});
