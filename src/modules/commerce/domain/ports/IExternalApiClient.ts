import { ProductData } from '../valueObjects/ProductData.js';
import { MarketingMetrics } from '../valueObjects/MarketingMetrics.js';
import { DateRange } from '../../../../core/domain/valueObjects/Types.js';

export interface ProductFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface IExternalApiClient {
  readonly platform: string;
  fetchProducts(filter?: ProductFilter): Promise<ProductData[]>;
  fetchMarketingMetrics(period: DateRange): Promise<MarketingMetrics[]>;
  healthCheck(): Promise<boolean>;
}
