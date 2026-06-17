import { ProductContentRequest, ProductContentResult } from '../valueObjects/ProductData';
import { MarketingMetrics } from '../valueObjects/MarketingMetrics';

export interface IAiService {
  generateProductContent(data: ProductContentRequest): Promise<ProductContentResult>;
  generateReportSummary(metrics: MarketingMetrics[]): Promise<string>;
  generateInsights(data: unknown, context: string): Promise<string[]>;
}
