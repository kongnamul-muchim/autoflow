export class ProductData {
  constructor(
    public readonly name: string,
    public readonly category: string,
    public readonly price: number,
    public readonly description: string,
    public readonly keywords: string[],
    public readonly images: string[] = [],
  ) {
    if (!name) throw new Error('ProductData: name is required');
    if (price < 0) throw new Error('ProductData: price must be non-negative');
  }

  get formattedPrice(): string {
    return `₩${this.price.toLocaleString()}`;
  }
}

export class ProductContentRequest {
  constructor(
    public readonly name: string,
    public readonly category: string,
    public readonly rawDescription: string,
    public readonly keywords: string[],
    public readonly targetAudience?: string,
    public readonly tone?: string,
  ) {}
}

export class ProductContentResult {
  constructor(
    public readonly title: string,
    public readonly description: string,
    public readonly keywords: string[],
    public readonly sellingPoints: string[],
    public readonly seoDescription: string,
    public readonly raw: string,
  ) {}
}
