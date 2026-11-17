import * as crypto from 'node:crypto';
import { ITaskRepository } from '../../../../core/domain/ports/IRepository.js';
import { ILogger } from '../../../../core/domain/ports/ILogger.js';
import { IAiService } from '../../../../core/domain/ports/IAiService.js';
import { Task } from '../../../../core/domain/entities/Task.js';
import { TaskResult } from '../../../../core/domain/entities/Task.js';
import { CreateProductRequest } from '../dto/CreateProductRequest.js';

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
    );

    await this.repository.save(task);

    try {
      task.start();
      await this.repository.updateStatus(taskId, 'running');

      const prompt = this.buildPrompt(request);
      const response = await this.aiService.generateText(prompt, 'You are an e-commerce product copywriter for a Korean beauty brand.');
      const parsed = this.parseContent(response);

      const result = TaskResult.success(taskId, {
        productName: request.name,
        generatedTitle: parsed.title,
        generatedDescription: parsed.description,
        keywords: parsed.keywords,
        sellingPoints: parsed.sellingPoints,
        seoDescription: parsed.seoDescription,
      });

      task.complete(result);
      await this.repository.updateStatus(taskId, 'completed');

      this.logger.info('CreateProductDescription', 'Successfully generated product content', {
        taskId, productName: request.name,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      task.fail(message);
      await this.repository.updateStatus(taskId, 'failed');
      this.logger.error('CreateProductDescription', 'Failed to generate product content', { error: message, taskId });
      throw error;
    }
  }

  private buildPrompt(data: CreateProductRequest): string {
    return `Create compelling product content for the following product:

Product Name: ${data.name}
Category: ${data.category}
Original Description: ${data.rawDescription}
Keywords: ${data.keywords.join(', ')}${data.targetAudience ? `
Target Audience: ${data.targetAudience}` : ''}${data.tone ? `
Tone: ${data.tone}` : ''}

Please provide:
1. An optimized product title (Korean, max 50 characters)
2. A compelling product description (Korean, 2-3 paragraphs)
3. 5-8 relevant keywords
4. 3 key selling points
5. An SEO-optimized meta description (Korean, max 150 characters)

Format your response as JSON:
{
  "title": "...",
  "description": "...",
  "keywords": ["...", "..."],
  "sellingPoints": ["...", "..."],
  "seoDescription": "..."
}`;
  }

  private parseContent(response: string): { title: string; description: string; keywords: string[]; sellingPoints: string[]; seoDescription: string } {
    try {
      const parsed = JSON.parse(response);
      return {
        title: parsed.title || '',
        description: parsed.description || '',
        keywords: parsed.keywords || [],
        sellingPoints: parsed.sellingPoints || [],
        seoDescription: parsed.seoDescription || '',
      };
    } catch {
      return {
        title: '자동 생성 상품',
        description: response,
        keywords: [],
        sellingPoints: [],
        seoDescription: response.substring(0, 150),
      };
    }
  }
}
