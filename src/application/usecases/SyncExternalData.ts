import { IExternalApiClient } from '../../domain/ports/IExternalApiClient.js';
import { ITaskRepository } from '../../domain/ports/IRepository.js';
import { ILogger } from '../../domain/ports/ILogger.js';
import { Task } from '../../domain/entities/Task.js';
import { TaskResult } from '../../domain/entities/Task.js';
import { ProductData } from '../../domain/valueObjects/ProductData.js';
import { DateRange } from '../../domain/valueObjects/Types.js';
import * as crypto from 'node:crypto';

export interface SyncRequest {
  sourcePlatform: string;
  targetPlatform: string;
  productIds?: string[];
  fullSync?: boolean;
}

export class SyncExternalData {
  constructor(
    private readonly apiClients: IExternalApiClient[],
    private readonly repository: ITaskRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(request: SyncRequest): Promise<TaskResult> {
    this.logger.info('SyncExternalData', 'Starting data sync', {
      from: request.sourcePlatform,
      to: request.targetPlatform,
    });

    const taskId = crypto.randomUUID();
    const task = new Task(
      taskId,
      `데이터동기화_${request.sourcePlatform}→${request.targetPlatform}`,
      'data_sync',
      { sourcePlatform: request.sourcePlatform, targetPlatform: request.targetPlatform },
    );

    await this.repository.save(task);

    try {
      task.start();
      await this.repository.updateStatus(taskId, 'running');

      const sourceClient = this.apiClients.find(c => c.platform === request.sourcePlatform);
      if (!sourceClient) throw new Error(`No API client found for platform: ${request.sourcePlatform}`);

      const products = await sourceClient.fetchProducts();
      this.logger.info('SyncExternalData', `Fetched ${products.length} products from ${request.sourcePlatform}`);

      const result = TaskResult.success(taskId, {
        sourcePlatform: request.sourcePlatform,
        productsSynced: products.length,
        products: products.map(p => ({
          name: p.name,
          category: p.category,
          price: p.price,
        })),
        syncCompletedAt: new Date().toISOString(),
      });

      task.complete(result);
      await this.repository.updateStatus(taskId, 'completed');

      this.logger.info('SyncExternalData', 'Data sync completed', { taskId, productsCount: products.length });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      task.fail(message);
      await this.repository.updateStatus(taskId, 'failed');
      throw error;
    }
  }
}
