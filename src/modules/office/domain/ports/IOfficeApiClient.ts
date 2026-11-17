import { Document } from '../valueObjects/Document.js';
import { DateRange } from '../../../../core/domain/valueObjects/Types.js';

export interface IDocumentFilter {
  type?: string;
  author?: string;
  dateFrom?: Date;
  dateTo?: Date;
  tags?: string[];
  limit?: number;
}

export interface IOfficeApiClient {
  readonly source: string;
  fetchDocuments(filter?: IDocumentFilter): Promise<Document[]>;
  fetchKpiData(period: DateRange): Promise<Record<string, number>>;
  healthCheck(): Promise<boolean>;
}
