import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncExternalData, SyncRequest } from '../../../src/modules/commerce/application/usecases/SyncExternalData.js';
import { IExternalApiClient } from '../../../src/modules/commerce/domain/ports/IExternalApiClient.js';
import { ITaskRepository } from '../../../src/core/domain/ports/IRepository.js';
import { ILogger } from '../../../src/core/domain/ports/ILogger.js';
import { ProductData } from '../../../src/modules/commerce/domain/valueObjects/ProductData.js';
import { MarketingMetrics } from '../../../src/modules/commerce/domain/valueObjects/MarketingMetrics.js';

const mockLogger: ILogger = {
  level: 'debug',
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const mockRepository: ITaskRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
};

function createMockClient(platform: string, products: ProductData[]): IExternalApiClient {
  return {
    platform,
    fetchProducts: vi.fn().mockResolvedValue(products),
    fetchMarketingMetrics: vi.fn().mockResolvedValue([] as MarketingMetrics[]),
    healthCheck: vi.fn().mockResolvedValue(true),
  };
}

describe('SyncExternalData', () => {
  let useCase: SyncExternalData;

  beforeEach(() => {
    vi.clearAllMocks();

    const clients = [
      createMockClient('cafe24', [
        new ProductData('립스틱', '립', 32000, '립스틱 설명', ['립']),
        new ProductData('쿠션', '베이스', 45000, '쿠션 설명', ['쿠션']),
      ]),
      createMockClient('meta', []),
    ];

    useCase = new SyncExternalData(clients, mockRepository, mockLogger);
  });

  it('소스 플랫폼에서 데이터를 가져와 동기화한다', async () => {
    const request: SyncRequest = {
      sourcePlatform: 'cafe24',
      targetPlatform: 'meta',
    };

    const result = await useCase.execute(request);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('productsSynced', 2);
    expect(result.data).toHaveProperty('sourcePlatform', 'cafe24');
    expect(mockRepository.save).toHaveBeenCalledOnce();
    expect(mockRepository.updateStatus).toHaveBeenCalledWith(expect.any(String), 'completed');
  });

  it('존재하지 않는 플랫폼은 실패 처리한다', async () => {
    const request: SyncRequest = {
      sourcePlatform: 'nonexistent',
      targetPlatform: 'cafe24',
    };

    await expect(useCase.execute(request)).rejects.toThrow('No API client found');
    expect(mockRepository.updateStatus).toHaveBeenCalledWith(expect.any(String), 'failed');
  });
});
