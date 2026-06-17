import { Task, TaskResult } from '../../domain/entities/Task.js';
import { TaskStatus, TaskFilter, TaskType, TaskPriority } from '../../domain/valueObjects/Types.js';
import { IPipelineRepository, ITaskRepository } from '../../domain/ports/IRepository.js';
import { Pipeline } from '../../domain/entities/Pipeline.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export class JsonFileTaskRepository implements ITaskRepository {
  constructor(
    private readonly filePath: string,
    private readonly logger: ILogger,
  ) {}

  async save(task: Task): Promise<void> {
    const tasks = await this.loadAll();
    tasks.set(task.id, task);
    await this.persistAll(tasks);
    this.logger.debug('JsonFileTaskRepository', `Saved task ${task.id}`);
  }

  async findById(id: string): Promise<Task | null> {
    const tasks = await this.loadAll();
    return tasks.get(id) ?? null;
  }

  async findAll(filter?: TaskFilter): Promise<Task[]> {
    const tasks = Array.from((await this.loadAll()).values());
    if (!filter) return tasks;

    return tasks.filter(t => {
      if (filter.status && t.status !== filter.status) return false;
      if (filter.type && t.type !== filter.type) return false;
      if (filter.priority && t.priority !== filter.priority) return false;
      return true;
    });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<void> {
    const tasks = await this.loadAll();
    const task = tasks.get(id);
    if (task) {
      task.status = status;
      await this.persistAll(tasks);
    }
  }

  async delete(id: string): Promise<void> {
    const tasks = await this.loadAll();
    tasks.delete(id);
    await this.persistAll(tasks);
  }

  private async loadAll(): Promise<Map<string, Task>> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      const map = new Map<string, Task>();
      for (const [key, val] of Object.entries(parsed)) {
        const v = val as Record<string, unknown>;
        const task = new Task(
          v.id as string,
          v.name as string,
          v.type as TaskType,
          v.config as Record<string, unknown>,
          v.status as TaskStatus,
          v.priority as TaskPriority,
          new Date(v.createdAt as string),
        );
        if (v.result) {
          const r = v.result as Record<string, unknown>;
          task.result = new TaskResult(
            task.id,
            r.success as boolean,
            r.data,
            new Date(r.executedAt as string),
            r.error as string | undefined,
          );
        }
        map.set(key, task);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  private async persistAll(tasks: Map<string, Task>): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const obj: Record<string, unknown> = {};
    for (const [key, task] of Array.from(tasks.entries())) {
      obj[key] = task.toJSON();
    }
    await fs.writeFile(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
  }
}

export class JsonFilePipelineRepository implements IPipelineRepository {
  constructor(
    private readonly filePath: string,
    private readonly logger: ILogger,
  ) {}

  async save(pipeline: Pipeline): Promise<void> {
    const pipelines = await this.loadAll();
    pipelines.set(pipeline.id, pipeline);
    await this.persistAll(pipelines);
  }

  async findById(id: string): Promise<Pipeline | null> {
    const pipelines = await this.loadAll();
    return pipelines.get(id) ?? null;
  }

  async findAll(): Promise<Pipeline[]> {
    return Array.from((await this.loadAll()).values());
  }

  async delete(id: string): Promise<void> {
    const pipelines = await this.loadAll();
    pipelines.delete(id);
    await this.persistAll(pipelines);
  }

  private async loadAll(): Promise<Map<string, Pipeline>> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data);
      const map = new Map<string, Pipeline>();
      for (const [key, val] of Object.entries(parsed)) {
        map.set(key, val as unknown as Pipeline);
      }
      return map;
    } catch {
      return new Map();
    }
  }

  private async persistAll(pipelines: Map<string, Pipeline>): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const obj: Record<string, unknown> = {};
    for (const [key, pipeline] of Array.from(pipelines.entries())) {
      obj[key] = pipeline.toJSON();
    }
    await fs.writeFile(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
  }
}
