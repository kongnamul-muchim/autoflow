import { ProductData } from '../valueObjects/ProductData';
import { MarketingMetrics } from '../valueObjects/MarketingMetrics';
import { DateRange } from '../valueObjects/Types';

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
