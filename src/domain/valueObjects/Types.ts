/** Core types used across the domain */

export type TaskType = 'product_description' | 'marketing_report' | 'data_sync' | 'pipeline';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high';
export type NotificationChannel = 'console' | 'slack' | 'email';

export class DateRange {
  constructor(
    public readonly start: Date,
    public readonly end: Date,
  ) {
    if (start > end) throw new Error('DateRange: start must be before end');
  }

  get durationDays(): number {
    return Math.ceil((this.end.getTime() - this.start.getTime()) / (1000 * 60 * 60 * 24));
  }

  toISOString(): { start: string; end: string } {
    return {
      start: this.start.toISOString(),
      end: this.end.toISOString(),
    };
  }

  static today(): DateRange {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return new DateRange(start, end);
  }

  static thisWeek(): DateRange {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return new DateRange(start, end);
  }
}

export class CronExpression {
  constructor(public readonly expression: string) {
    if (!/^(\S+\s+){4}\S+$/.test(expression) && expression !== '') {
      if (expression !== '@daily' && expression !== '@hourly' && expression !== '@weekly') {
        throw new Error(`Invalid cron expression: ${expression}`);
      }
    }
  }
}

export interface NotificationConfig {
  channel: NotificationChannel;
  onSuccess: boolean;
  onFailure: boolean;
}

export interface TaskFilter {
  status?: TaskStatus;
  type?: TaskType;
  priority?: TaskPriority;
}

export interface TaskConfig {
  readonly [key: string]: unknown;
}
