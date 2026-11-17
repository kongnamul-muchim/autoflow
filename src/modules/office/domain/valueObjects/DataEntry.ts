export type EntryStatus = 'pending' | 'validated' | 'completed' | 'error';

export class DataField {
  constructor(
    public readonly name: string,
    public readonly value: string,
    public readonly type: 'text' | 'number' | 'date' | 'email' | 'phone' = 'text',
    public readonly required: boolean = false,
    public readonly validationMessage?: string,
  ) {}
}

export class DataEntry {
  constructor(
    public readonly id: string,
    public readonly source: string,
    public readonly fields: DataField[],
    public readonly status: EntryStatus = 'pending',
    public readonly createdAt: Date = new Date(),
    public readonly processedAt?: Date,
  ) {}

  get isValid(): boolean {
    return this.fields.every(f => !f.required || f.value.length > 0);
  }

  get errorCount(): number {
    return this.fields.filter(f => f.validationMessage).length;
  }
}

export class BatchResult {
  constructor(
    public readonly totalCount: number,
    public readonly successCount: number,
    public readonly errorCount: number,
    public readonly errors: Array<{ index: number; message: string }>,
    public readonly totalTime: string,
  ) {}
}
