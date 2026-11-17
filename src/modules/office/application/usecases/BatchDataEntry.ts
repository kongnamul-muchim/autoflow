import * as crypto from 'node:crypto';
import { IAiService } from '../../../../core/domain/ports/IAiService.js';
import { ILogger } from '../../../../core/domain/ports/ILogger.js';
import { DataField, DataEntry, BatchResult } from '../../domain/valueObjects/DataEntry.js';
import { DataEntryRequest } from '../dto/DocumentRequest.js';

export class BatchDataEntry {
  constructor(
    private readonly aiService: IAiService,
    private readonly logger: ILogger,
  ) {}

  async execute(request: DataEntryRequest): Promise<BatchResult> {
    this.logger.info('BatchDataEntry', 'Starting batch data entry', {
      source: request.source,
      recordCount: request.records.length,
    });

    const entries: DataEntry[] = [];
    const errors: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < request.records.length; i++) {
      const record = request.records[i];
      const fields = Object.entries(record).map(([key, value]) =>
        new DataField(key, value, this.inferType(value), true),
      );

      const entry = new DataEntry(
        crypto.randomUUID(),
        request.source,
        fields,
        fields.every(f => !f.required || f.value.length > 0) ? 'validated' : 'error',
      );

      if (!entry.isValid) {
        errors.push({ index: i, message: `Record ${i + 1}: 필수 필드 누락` });
      }

      entries.push(entry);
    }

    const startTime = Date.now();

    // If not validate-only, process with AI
    if (!request.validateOnly && entries.length > 0) {
      const validEntries = entries.filter(e => e.isValid);
      await this.aiService.generateText(
        `Process ${validEntries.length} data entries from ${request.source}.\nValidate and format each record.`,
      );
    }

    const totalTime = `${((Date.now() - startTime) / 1000).toFixed(1)}초`;

    this.logger.info('BatchDataEntry', 'Batch processing completed', {
      total: request.records.length,
      success: request.records.length - errors.length,
      errors: errors.length,
    });

    return new BatchResult(
      request.records.length,
      request.records.length - errors.length,
      errors.length,
      errors,
      totalTime,
    );
  }

  private inferType(value: string): 'text' | 'number' | 'date' | 'email' | 'phone' {
    if (/^\d+$/.test(value)) return 'number';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
    if (/^\d{2,3}-\d{3,4}-\d{4}$/.test(value)) return 'phone';
    return 'text';
  }
}
