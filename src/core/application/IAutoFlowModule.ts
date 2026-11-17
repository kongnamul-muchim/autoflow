import { TaskHandlerRegistry } from './TaskHandlerRegistry.js';
import { IAiService } from '../domain/ports/IAiService.js';
import { ILogger } from '../domain/ports/ILogger.js';
import { ITaskRepository } from '../domain/ports/IRepository.js';

export interface IAutoFlowModule {
  readonly name: string;
  readonly label: string;
  readonly description: string;
  getUseCases?(repos: { taskRepo: ITaskRepository; logger: ILogger }): Record<string, unknown>;
  registerHandlers(
    registry: TaskHandlerRegistry,
    aiService: IAiService,
    logger: ILogger,
    repos: { taskRepo: ITaskRepository },
  ): void;
}
