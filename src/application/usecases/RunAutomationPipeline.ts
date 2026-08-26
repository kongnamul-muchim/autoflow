import { ITaskRepository, IPipelineRepository } from '../../domain/ports/IRepository.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { Pipeline } from '../../domain/entities/Pipeline.js';
import { Task, TaskResult } from '../../domain/entities/Task.js';
import { TaskType } from '../../domain/valueObjects/Types.js';
import { CreateProductDescription } from './CreateProductDescription.js';
import { GenerateMarketingReport } from './GenerateMarketingReport.js';
import { CreateProductRequest } from '../dto/CreateProductRequest.js';
import { ReportRequest } from '../dto/PipelineRequest.js';
import { DateRange } from '../../domain/valueObjects/Types.js';
import * as crypto from 'node:crypto';

export class RunAutomationPipeline {
  constructor(
    private readonly createProductDescription: CreateProductDescription,
    private readonly generateMarketingReport: GenerateMarketingReport,
    private readonly pipelineRepository: IPipelineRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(name: string, tasks: Array<{
    type: TaskType;
    config: Record<string, unknown>;
  }>): Promise<{ pipeline: Pipeline; results: unknown[] }> {
    this.logger.info('RunAutomationPipeline', 'Starting pipeline', { name, taskCount: tasks.length });

    const pipelineId = crypto.randomUUID();
    const pipelineTasks: Task[] = [];
    const results: unknown[] = [];

    // Create task entities
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

    // Execute each task sequentially
    for (const task of pipelineTasks) {
      try {
        task.start();
        this.logger.info('RunAutomationPipeline', `Executing task: ${task.name}`, { taskId: task.id });

        let result: unknown;
        switch (task.type) {
          case 'product_description': {
            const config = task.config as Record<string, string>;
            const req = new CreateProductRequest(
              config.name || 'Unknown Product',
              config.category || 'General',
              config.description || '',
              (config.keywords || '').split(',').filter(Boolean),
            );
            result = await this.createProductDescription.execute(req);
            break;
          }
          case 'marketing_report': {
            const config = task.config as Record<string, unknown>;
            const req = new ReportRequest(
              DateRange.today(),
              (config.platforms as string[]) || [],
            );
            const res = await this.generateMarketingReport.execute(req);
            result = res.report;
            break;
          }
          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }

        results.push(result);
        const taskResult = TaskResult.success(task.id, result);
        task.complete(taskResult);
        await this.taskRepository.updateStatus(task.id, 'completed');
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
