import { Task } from '../domain/entities/Task.js';
import { IAiService } from '../domain/ports/IAiService.js';
import { ILogger } from '../domain/ports/ILogger.js';

export interface ITaskHandler {
  readonly type: string;
  execute(task: Task, aiService: IAiService, logger: ILogger): Promise<import('../domain/entities/Task.js').TaskResult>;
}
