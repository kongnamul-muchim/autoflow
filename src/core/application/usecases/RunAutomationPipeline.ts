import * as crypto from 'node:crypto';
import { IPipelineRepository, ITaskRepository } from '../../domain/ports/IRepository.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { IAiService } from '../../domain/ports/IAiService.js';
import { Pipeline } from '../../domain/entities/Pipeline.js';
import { Task } from '../../domain/entities/Task.js';
import { TaskHandlerRegistry } from '../TaskHandlerRegistry.js';

export interface PipelineTaskDef {
  type: string;
  config: Record<string, unknown>;
}

export class RunAutomationPipeline {
  constructor(
    private readonly registry: TaskHandlerRegistry,
    private readonly aiService: IAiService,
    private readonly pipelineRepository: IPipelineRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(name: string, tasks: PipelineTaskDef[]): Promise<{ pipeline: Pipeline; results: unknown[] }> {
    this.logger.info('RunAutomationPipeline', 'Starting pipeline', { name, taskCount: tasks.length });

    const pipelineId = crypto.randomUUID();
    const pipelineTasks: Task[] = [];
    const results: unknown[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const taskDef = tasks[i];
      const taskId = crypto.randomUUID();
      const task = new Task(
        taskId,
        `${name}_step${i + 1}_${taskDef.type}`,
        taskDef.type,
        taskDef.config,
      );
      pipelineTasks.push(task);
      await this.taskRepository.save(task);
    }

    const pipeline = new Pipeline(pipelineId, name, pipelineTasks);
    await this.pipelineRepository.save(pipeline);

    for (const task of pipelineTasks) {
      try {
        this.logger.info('RunAutomationPipeline', `Executing task: ${task.name}`, { taskId: task.id });
        task.start();
        await this.taskRepository.updateStatus(task.id, 'running');

        const handler = this.registry.get(task.type);
        const result = await handler.execute(task, this.aiService, this.logger);

        results.push(result.data);
        await this.taskRepository.updateStatus(task.id, 'completed');
        this.logger.info('RunAutomationPipeline', `Task completed: ${task.name}`, { taskId: task.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        task.fail(message);
        await this.taskRepository.updateStatus(task.id, 'failed');
        throw error;
      }
    }

    this.logger.info('RunAutomationPipeline', 'Pipeline completed successfully', {
      pipelineId,
      successfulTasks: results.length,
    });

    return { pipeline, results };
  }
}
