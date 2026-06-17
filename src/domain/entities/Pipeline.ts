import { Task } from './Task';
import { CronExpression, NotificationConfig } from '../valueObjects/Types';

export class Pipeline {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tasks: Task[],
    public readonly schedule?: CronExpression,
    public readonly notifications: NotificationConfig[] = [],
  ) {
    if (tasks.length === 0) throw new Error('Pipeline must have at least one task');
  }

  get status(): string {
    if (this.tasks.every(t => t.status === 'completed')) return 'completed';
    if (this.tasks.some(t => t.status === 'running')) return 'running';
    if (this.tasks.some(t => t.status === 'failed')) return 'failed';
    return 'pending';
  }

  get estimatedDuration(): number {
    return this.tasks.length; // simplified: each task = 1 unit
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      tasks: this.tasks.map(t => t.toJSON()),
      schedule: this.schedule?.expression,
      status: this.status,
    };
  }
}
