import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { JsonFileTaskRepository, JsonFilePipelineRepository } from '../../../src/infrastructure/repository/JsonFileRepository.js';
import { Task, TaskResult } from '../../../src/core/domain/entities/Task.js';
import { Pipeline } from '../../../src/core/domain/entities/Pipeline.js';
import { ILogger } from '../../../src/core/domain/ports/ILogger.js';

class TestLogger implements ILogger {
  level = 'debug' as any;
  debug() { /* noop */ }
  info() { /* noop */ }
  warn() { /* noop */ }
  error() { /* noop */ }
}

const logger = new TestLogger();

describe('JsonFileTaskRepository', () => {
  let tmpDir: string;
  let filePath: string;
  let repo: JsonFileTaskRepository;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autoflow-test-'));
    filePath = path.join(tmpDir, 'tasks.json');
    repo = new JsonFileTaskRepository(filePath, logger);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('저장한 Task를 ID로 조회한다', async () => {
    const task = new Task('test-1', '테스트', 'product_description', { key: 'value' });
    await repo.save(task);

    const found = await repo.findById('test-1');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('test-1');
    expect(found!.name).toBe('테스트');
  });

  it('없는 ID는 null을 반환한다', async () => {
    const found = await repo.findById('nonexistent');
    expect(found).toBeNull();
  });

  it('모든 Task를 조회한다', async () => {
    await repo.save(new Task('t1', 'Task 1', 'product_description', {}));
    await repo.save(new Task('t2', 'Task 2', 'marketing_report', {}));

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('상태로 필터링한다', async () => {
    const t1 = new Task('t1', 'Task 1', 'product_description', {});
    const t2 = new Task('t2', 'Task 2', 'marketing_report', {});
    (t2 as any).status = 'running';
    await repo.save(t1);
    await repo.save(t2);

    const pendingTasks = await repo.findAll({ status: 'pending' });
    expect(pendingTasks).toHaveLength(1);
    expect(pendingTasks[0].id).toBe('t1');
  });

  it('Task 상태를 업데이트한다', async () => {
    await repo.save(new Task('t1', 'Task 1', 'data_sync', {}));
    await repo.updateStatus('t1', 'running');

    const task = await repo.findById('t1');
    expect(task!.status).toBe('running');
  });

  it('Task를 삭제한다', async () => {
    await repo.save(new Task('t1', 'Task 1', 'pipeline', {}));
    await repo.delete('t1');

    const found = await repo.findById('t1');
    expect(found).toBeNull();
  });

  it('TaskResult를 포함한 Task를 저장/복원한다', async () => {
    const task = new Task('t1', '완료된 태스크', 'product_description', {});
    task.start();
    task.complete(TaskResult.success('t1', { result: '성공' }, { durationMs: 500 }));
    await repo.save(task);

    const found = await repo.findById('t1');
    expect(found!.status).toBe('completed');
    expect(found!.result).not.toBeNull();
    expect(found!.result!.success).toBe(true);
    expect(found!.result!.data).toEqual({ result: '성공' });
  });

  it('파일이 없으면 빈 저장소로 시작한다', async () => {
    const all = await repo.findAll();
    expect(all).toHaveLength(0);
  });
});

describe('JsonFilePipelineRepository', () => {
  let tmpDir: string;
  let filePath: string;
  let repo: JsonFilePipelineRepository;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autoflow-pipeline-test-'));
    filePath = path.join(tmpDir, 'pipelines.json');
    repo = new JsonFilePipelineRepository(filePath, logger);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('Pipeline을 저장/조회한다', async () => {
    const pipeline = new Pipeline('p-1', '테스트 파이프라인', [
      new Task('t-1', 'Task 1', 'product_description', {}),
    ]);
    await repo.save(pipeline);

    const found = await repo.findById('p-1');
    expect(found).not.toBeNull();
    expect(found!.name).toBe('테스트 파이프라인');
  });

  it('모든 Pipeline을 조회한다', async () => {
    await repo.save(new Pipeline('p-1', 'Pipe 1', [new Task('t-1', 'Task 1', 'product_description', {})]));
    await repo.save(new Pipeline('p-2', 'Pipe 2', [new Task('t-2', 'Task 2', 'product_description', {})]));

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('Pipeline을 삭제한다', async () => {
    await repo.save(new Pipeline('p-1', 'Pipe 1', [new Task('t-1', 'Task 1', 'product_description', {})]));
    await repo.delete('p-1');
    expect(await repo.findById('p-1')).toBeNull();
  });
});
