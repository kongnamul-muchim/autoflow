import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProductDescription } from '../../../src/application/usecases/CreateProductDescription';
import { IAiService } from '../../../src/domain/ports/IAiService';
import { ITaskRepository } from '../../../src/domain/ports/IRepository';
import { ILogger } from '../../../src/domain/ports/ILogger';
import { CreateProductRequest } from '../../../src/application/dto/CreateProductRequest';
import { ProductContentResult } from '../../../src/domain/valueObjects/ProductData';

// Mock implementations
const mockAiService: IAiService = {
  generateProductContent: vi.fn(),
  generateReportSummary: vi.fn(),
  generateInsights: vi.fn(),
};

const mockRepository: ITaskRepository = {
  save: vi.fn(),
  findById: vi.fn(),
  findAll: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
};

const mockLogger: ILogger = {
  level: 'debug',
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe('CreateProductDescription', () => {
  let useCase: CreateProductDescription;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new CreateProductDescription(mockAiService, mockRepository, mockLogger);
  });

  it('성공적으로 상품 설명을 생성한다', async () => {
    const mockResult = new ProductContentResult(
      '글로우 립스틱',
      '선명한 발색의 립스틱',
      ['립', '글로우'],
      ['지속력', '발색력'],
      'SEO 메타 설명',
      '{"raw":"response"}',
    );
    vi.mocked(mockAiService.generateProductContent).mockResolvedValue(mockResult);

    const request = new CreateProductRequest('립스틱', '립메이크업', '원본 설명', ['립', '글로우']);

    const result = await useCase.execute(request);

    expect(result.success).toBe(true);
    expect(mockAiService.generateProductContent).toHaveBeenCalledOnce();
    expect(mockRepository.save).toHaveBeenCalledOnce();
    expect(mockRepository.updateStatus).toHaveBeenCalledTimes(2); // running, completed
    expect(result.data).toHaveProperty('generatedTitle', '글로우 립스틱');
  });

  it('AI 서비스 실패 시 태스크 상태를 failed로 변경한다', async () => {
    vi.mocked(mockAiService.generateProductContent).mockRejectedValue(new Error('API timeout'));

    const request = new CreateProductRequest('립스틱', '립', '설명', []);

    await expect(useCase.execute(request)).rejects.toThrow('API timeout');
    expect(mockRepository.updateStatus).toHaveBeenCalledWith(expect.any(String), 'failed');
  });

  it('Task 저장소에 태스크를 저장한다', async () => {
    vi.mocked(mockAiService.generateProductContent).mockResolvedValue(
      new ProductContentResult('T', 'D', [], [], '', ''),
    );

    await useCase.execute(new CreateProductRequest('A', 'B', 'C', ['k']));

    expect(mockRepository.save).toHaveBeenCalled();
    const savedTask = vi.mocked(mockRepository.save).mock.calls[0][0];
    expect(savedTask.name).toContain('A');
    expect(savedTask.type).toBe('product_description');
  });
});
