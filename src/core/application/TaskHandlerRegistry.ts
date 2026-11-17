import { ITaskHandler } from './ITaskHandler.js';
import { IAiService } from '../domain/ports/IAiService.js';
import { ILogger } from '../domain/ports/ILogger.js';
import { Task } from '../domain/entities/Task.js';
import { TaskResult } from '../domain/entities/Task.js';

export class TaskHandlerRegistry {
  private handlers = new Map<string, ITaskHandler>();

  register(handler: ITaskHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Handler already registered for task type: ${handler.type}`);
    }
    this.handlers.set(handler.type, handler);
  }

  get(type: string): ITaskHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`No handler registered for task type: ${type}`);
    }
    return handler;
  }

  has(type: string): boolean {
    return this.handlers.has(type);
  }

  getAllTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
