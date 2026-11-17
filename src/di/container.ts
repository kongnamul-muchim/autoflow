import { IAiService } from '../core/domain/ports/IAiService.js';
import { ILogger } from '../core/domain/ports/ILogger.js';
import { ITaskRepository, IPipelineRepository } from '../core/domain/ports/IRepository.js';
import { IConfigService } from '../core/domain/ports/IConfigService.js';

import { ClaudeApiClient } from '../infrastructure/ai/ClaudeApiClient.js';
import { JsonFileTaskRepository, JsonFilePipelineRepository } from '../infrastructure/repository/JsonFileRepository.js';
import { ConsoleLogger } from '../infrastructure/logger/ConsoleLogger.js';
import { EnvironmentConfig } from '../infrastructure/config/EnvironmentConfig.js';
import { ConsoleNotificationService } from '../infrastructure/notification/ConsoleNotificationService.js';

import { TaskHandlerRegistry } from '../core/application/TaskHandlerRegistry.js';
import { RunAutomationPipeline } from '../core/application/usecases/RunAutomationPipeline.js';
import { IAutoFlowModule } from '../core/application/IAutoFlowModule.js';

import * as path from 'node:path';

type ModuleLoader = () => Promise<{ default: new () => IAutoFlowModule }>;

const MODULE_REGISTRY: Record<string, ModuleLoader> = {
  commerce: () => import('../modules/commerce/module.js'),
  office: () => import('../modules/office/module.js'),
};

export interface ContainerResult {
  logger: ILogger;
  config: ReturnType<IConfigService['get']>;
  aiService: IAiService;
  taskRepo: ITaskRepository;
  pipelineRepo: IPipelineRepository;
  registry: TaskHandlerRegistry;
  runAutomationPipeline: RunAutomationPipeline;
  module: IAutoFlowModule;
}

export async function createContainer(moduleName?: string): Promise<ContainerResult> {
  // ── Infrastructure Layer ──
  const logger: ILogger = new ConsoleLogger('debug');
  const configService = new EnvironmentConfig();
  const config = configService.get();
  const activeModule = moduleName || config.activeModule || 'commerce';
  const dataDir = config.dataDir;

  const taskRepo: ITaskRepository = new JsonFileTaskRepository(
    path.join(dataDir, 'tasks.json'),
    logger,
  );
  const pipelineRepo: IPipelineRepository = new JsonFilePipelineRepository(
    path.join(dataDir, 'pipelines.json'),
    logger,
  );

  // ── AI Service ──
  const aiService: IAiService = new ClaudeApiClient(logger, config);

  // ── Task Handler Registry ──
  const registry = new TaskHandlerRegistry();

  // ── Load Module ──
  const loader = MODULE_REGISTRY[activeModule];
  if (!loader) {
    const available = Object.keys(MODULE_REGISTRY).join(', ');
    throw new Error(`Unknown module "${activeModule}". Available: ${available}`);
  }

  const moduleDef = await loader();
  const moduleInstance = new moduleDef.default();
  moduleInstance.registerHandlers(registry, aiService, logger, { taskRepo });

  // ── Application Layer ──
  const runAutomationPipeline = new RunAutomationPipeline(
    registry,
    aiService,
    pipelineRepo,
    taskRepo,
    logger,
  );

  logger.info('Container', 'AutoFlow container initialized', {
    module: activeModule,
    taskTypes: registry.getAllTypes(),
    dataDir,
  });

  return {
    logger,
    config,
    aiService,
    taskRepo,
    pipelineRepo,
    registry,
    runAutomationPipeline,
    module: moduleInstance,
  };
}
