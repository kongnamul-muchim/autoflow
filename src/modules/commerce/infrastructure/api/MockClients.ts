import { IExternalApiClient, ProductFilter } from '../../domain/ports/IExternalApiClient.js';
import { ProductData } from '../../domain/valueObjects/ProductData.js';
import { MarketingMetrics } from '../../domain/valueObjects/MarketingMetrics.js';
import { DateRange } from '../../../../core/domain/valueObjects/Types.js';
import { ILogger } from '../../../../core/domain/ports/ILogger.js';

const MOCK_PRODUCTS: ProductData[] = [
  new ProductData('글로우 립스틱', '립메이크업', 32000, '선명한 발색과 촉촉한 글로우 마무리감', ['립스틱', '글로우'], ['https://example.com/lip1.jpg']),
  new ProductData('매트 립스틱', '립메이크업', 28000, '부드러운 매트 텍스처의 벨벳 립스틱', ['립스틱', '매트'], ['https://example.com/lip2.jpg']),
  new ProductData('쿠션 파운데이션', '베이스메이크업', 45000, '자연스러운 커버력의 쿠션 파운데이션', ['쿠션', '파운데이션'], ['https://example.com/cushion1.jpg']),
  new ProductData('아이 섀도우 팔레트', '아이메이크업', 38000, '10가지 컬러로 다양한 룩 연출', ['아이섀도우', '팔레트'], ['https://example.com/eye1.jpg']),
  new ProductData('마스카라', '아이메이크업', 22000, '볼륨과 길이를 동시에', ['마스카라', '볼륨'], ['https://example.com/mascara1.jpg']),
  new ProductData('틴트', '립메이크업', 15000, '자연스러운 혈색감', ['틴트', '립'], ['https://example.com/tint1.jpg']),
];

export class MockCafe24Client implements IExternalApiClient {
  readonly platform = 'cafe24';
  constructor(private readonly logger: ILogger) {}

  async fetchProducts(filter?: ProductFilter): Promise<ProductData[]> {
    this.logger.info('MockCafe24Client', 'Fetching products', { filter });
    let products = [...MOCK_PRODUCTS];
    if (filter?.category) products = products.filter(p => p.category === filter.category);
    if (filter?.minPrice !== undefined) products = products.filter(p => p.price >= filter.minPrice!);
    if (filter?.maxPrice !== undefined) products = products.filter(p => p.price <= filter.maxPrice!);
    if (filter?.limit) products = products.slice(0, filter.limit);
    return products;
  }

  async fetchMarketingMetrics(period: DateRange): Promise<MarketingMetrics[]> {
    this.logger.info('MockCafe24Client', 'Fetching marketing metrics', { period });
    return [new MarketingMetrics('cafe24', 45000, 3200, 180, 1200000, 4200000, period)];
  }

  async healthCheck(): Promise<boolean> { return true; }
}

export class MockMetaClient implements IExternalApiClient {
  readonly platform = 'meta';
  constructor(private readonly logger: ILogger) {}

  async fetchProducts(_filter?: ProductFilter): Promise<ProductData[]> {
    this.logger.info('MockMetaClient', 'Meta does not provide product endpoint');
    return [];
  }

  async fetchMarketingMetrics(period: DateRange): Promise<MarketingMetrics[]> {
    this.logger.info('MockMetaClient', 'Fetching Meta Ads metrics');
    return [
      new MarketingMetrics('meta', 120000, 8500, 320, 3500000, 12500000, period),
      new MarketingMetrics('meta_instagram', 85000, 6200, 210, 2100000, 7800000, period),
    ];
  }

  async healthCheck(): Promise<boolean> { return true; }
}

export class MockNaverClient implements IExternalApiClient {
  readonly platform = 'naver';
  constructor(private readonly logger: ILogger) {}

  async fetchProducts(_filter?: ProductFilter): Promise<ProductData[]> {
    this.logger.info('MockNaverClient', 'Naver does not provide product endpoint via Search Ad API');
    return [];
  }

  async fetchMarketingMetrics(period: DateRange): Promise<MarketingMetrics[]> {
    this.logger.info('MockNaverClient', 'Fetching Naver Search Ad metrics');
    return [
      new MarketingMetrics('naver_powerlink', 68000, 4200, 150, 2800000, 8900000, period),
      new MarketingMetrics('naver_shopping', 95000, 5800, 230, 3200000, 11000000, period),
    ];
  }

  async healthCheck(): Promise<boolean> { return true; }
}
