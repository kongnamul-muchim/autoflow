import { TaskType, TaskStatus, TaskPriority, TaskConfig } from '../valueObjects/Types';

export class TaskResult {
  constructor(
    public readonly taskId: string,
    public readonly success: boolean,
    public readonly data: unknown,
    public readonly executedAt: Date,
    public readonly error?: string,
    public readonly metrics?: Record<string, number>,
  ) {}

  get duration(): number | null {
    return this.metrics?.durationMs ?? null;
  }

  static success(taskId: string, data: unknown, metrics?: Record<string, number>): TaskResult {
    return new TaskResult(taskId, true, data, new Date(), undefined, metrics);
  }

  static failure(taskId: string, error: string, metrics?: Record<string, number>): TaskResult {
    return new TaskResult(taskId, false, null, new Date(), error, metrics);
  }
}

export class Task {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly type: TaskType,
    public readonly config: TaskConfig,
    public status: TaskStatus = 'pending',
    public priority: TaskPriority = 'medium',
    public readonly createdAt: Date = new Date(),
    public result: TaskResult | null = null,
  ) {}

  start(): void {
    if (this.status !== 'pending') throw new Error(`Cannot start task ${this.id}: status is ${this.status}`);
    this.status = 'running';
  }

  complete(result: TaskResult): void {
    if (this.status !== 'running') throw new Error(`Cannot complete task ${this.id}: status is ${this.status}`);
    this.status = 'completed';
    this.result = result;
  }

  fail(error: string): void {
    this.status = 'failed';
    this.result = TaskResult.failure(this.id, error);
  }

  get isFinished(): boolean {
    return this.status === 'completed' || this.status === 'failed';
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      config: this.config,
      status: this.status,
      priority: this.priority,
      createdAt: this.createdAt.toISOString(),
      result: this.result ? {
        success: this.result.success,
        error: this.result.error,
        executedAt: this.result.executedAt.toISOString(),
        data: this.result.data ?? null,
      } : null,
    };
  }
}
