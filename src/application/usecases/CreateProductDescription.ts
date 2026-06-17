import { IAiService } from '../../domain/ports/IAiService.js';
import { ITaskRepository } from '../../domain/ports/IRepository.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { Task } from '../../domain/entities/Task.js';
import { TaskResult } from '../../domain/entities/Task.js';
import { ProductContentRequest, ProductContentResult } from '../../domain/valueObjects/ProductData.js';
import { CreateProductRequest } from '../dto/CreateProductRequest.js';
import * as crypto from 'node:crypto';

export class CreateProductDescription {
  constructor(
    private readonly aiService: IAiService,
    private readonly repository: ITaskRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(request: CreateProductRequest): Promise<TaskResult> {
    this.logger.info('CreateProductDescription', 'Starting product description generation', {
      productName: request.name,
    });

    const taskId = crypto.randomUUID();
    const task = new Task(
      taskId,
      `상품설명_${request.name}`,
      'product_description',
      { name: request.name, category: request.category },
      'pending',
      'medium',
    );

    await this.repository.save(task);

    try {
      task.start();
      await this.repository.updateStatus(taskId, 'running');

      const contentRequest = new ProductContentRequest(
        request.name,
        request.category,
        request.rawDescription,
        request.keywords,
        request.targetAudience,
        request.tone,
      );

      const content = await this.aiService.generateProductContent(contentRequest);

      const result = TaskResult.success(taskId, {
        productName: request.name,
        generatedTitle: content.title,
        generatedDescription: content.description,
        keywords: content.keywords,
        sellingPoints: content.sellingPoints,
        seoDescription: content.seoDescription,
      });

      task.complete(result);
      await this.repository.updateStatus(taskId, 'completed');

      this.logger.info('CreateProductDescription', 'Successfully generated product content', {
        taskId,
        productName: request.name,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      task.fail(message);
      await this.repository.updateStatus(taskId, 'failed');

      this.logger.error('CreateProductDescription', 'Failed to generate product content', {
        error: message,
        taskId,
      });

      throw error;
    }
  }
}
