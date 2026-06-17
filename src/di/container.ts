import { container as tsyringeContainer } from 'tsyringe';

import { IAiService } from '../domain/ports/IAiService.js';
import { IExternalApiClient } from '../domain/ports/IExternalApiClient.js';
import { ITaskRepository, IPipelineRepository } from '../domain/ports/IRepository.js';
import { ILogger } from '../domain/ports/ILogger.js';
import { IConfigService } from '../domain/ports/IConfigService.js';
import { INotificationService } from '../domain/ports/INotificationService.js';

import { ClaudeApiClient } from '../infrastructure/ai/ClaudeApiClient.js';
import { MockCafe24Client, MockMetaClient, MockNaverClient } from '../infrastructure/api/MockClients.js';
import { JsonFileTaskRepository, JsonFilePipelineRepository } from '../infrastructure/repository/JsonFileRepository.js';
import { ConsoleLogger } from '../infrastructure/logger/ConsoleLogger.js';
import { EnvironmentConfig } from '../infrastructure/config/EnvironmentConfig.js';
import { ConsoleNotificationService } from '../infrastructure/notification/ConsoleNotificationService.js';

import { CreateProductDescription } from '../application/usecases/CreateProductDescription.js';
import { GenerateMarketingReport } from '../application/usecases/GenerateMarketingReport.js';
import { SyncExternalData } from '../application/usecases/SyncExternalData.js';
import { RunAutomationPipeline } from '../application/usecases/RunAutomationPipeline.js';

import { CliController } from '../presentation/cli/CliController.js';
import * as path from 'node:path';

/**
 * AutoFlow DI Container — Composition Root
 *
 * 모든 의존성은 이 함수에서 한 번에 조립한다.
 * - 인터페이스 → 구현체 매핑
 * - 인스턴스 생명주기 관리 (Singleton)
 * - 프로필(development/production)에 따라 다른 구현체 등록 가능
 */
export function createContainer() {
  // ── Infrastructure Layer ──

  const logger: ILogger = new ConsoleLogger('debug');
  const configService = new EnvironmentConfig();
  const config = configService.get();
  const dataDir = config.dataDir;

  const taskRepo: ITaskRepository = new JsonFileTaskRepository(
    path.join(dataDir, 'tasks.json'),
    logger,
  );
  const pipelineRepo: IPipelineRepository = new JsonFilePipelineRepository(
    path.join(dataDir, 'pipelines.json'),
    logger,
  );

  // External API Clients (Mock — Strategy Pattern)
  const apiClients: IExternalApiClient[] = [
    new MockCafe24Client(logger),
    new MockMetaClient(logger),
    new MockNaverClient(logger),
  ];

  // ── Application Layer (Use Cases) ──

  const aiService: IAiService = new ClaudeApiClient(logger, config);

  const createProductDescription = new CreateProductDescription(aiService, taskRepo, logger);
  const generateMarketingReport = new GenerateMarketingReport(apiClients, aiService, logger);
  const syncExternalData = new SyncExternalData(apiClients, taskRepo, logger);
  const runAutomationPipeline = new RunAutomationPipeline(
    createProductDescription, generateMarketingReport, pipelineRepo, taskRepo, logger,
  );

  // ── Presentation Layer ──

  const cliController = new CliController(
    createProductDescription,
    generateMarketingReport,
    syncExternalData,
    runAutomationPipeline,
    logger,
  );

  return {
    logger,
    config,
    aiService,
    apiClients,
    taskRepo,
    pipelineRepo,
    createProductDescription,
    generateMarketingReport,
    syncExternalData,
    runAutomationPipeline,
    cliController,
  };
}
