import { Injectable } from '@nestjs/common';
import { Product } from '@/product/domain/entities/product.entity';
import {
  ProductRepository,
  PaginationResult,
} from '@/product/domain/repositories/product.repository';
import { ProductFixtures } from '@/product/infrastructure/fixtures/product.fixtures';

/**
 * In-Memory Product Repository Implementation
 * Stores products in Map for O(1) lookups
 * BR-PROD-01: Default sorting - newest first (createdAt DESC)
 */
@Injectable()
export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Map<string, Product>;

  constructor() {
    this.products = new Map();
    // Initialize with sample data
    this.initializeSampleData();
  }

  /**
   * Initialize repository with sample products
   */
  private initializeSampleData(): void {
    const sampleProducts = ProductFixtures.createSampleProducts();
    sampleProducts.forEach((product) => {
      this.products.set(product.id, product);
    });
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  /**
   * Find all products with pagination
   * BR-PROD-01: Default sorting - newest first (createdAt DESC)
   * BR-PROD-02: Default page size - 10 items
   * BR-PROD-03: Maximum page size - 100 items
   */
  async findAll(page: number, limit: number): Promise<PaginationResult<Product>> {
    // Get all products and sort by createdAt DESC (newest first)
    const allProducts = Array.from(this.products.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const total = allProducts.length;
    const totalPages = Math.ceil(total / limit);

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = allProducts.slice(startIndex, endIndex);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Find popular products based on sales (last 3 days)
   * Note: For in-memory implementation, we'll return products sorted by sold quantity
   */
  async findPopular(limit: number): Promise<Product[]> {
    const allProducts = Array.from(this.products.values());

    // Calculate total sold quantity for each product
    const productsWithSales = allProducts.map((product) => {
      const totalSold = product.options.reduce(
        (sum, option) => sum + option.stock.soldQuantity,
        0,
      );
      return { product, totalSold };
    });

    // Sort by sold quantity DESC and take top N
    return productsWithSales
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, limit)
      .map((item) => item.product);
  }

  /**
   * Save product (create or update)
   */
  async save(product: Product): Promise<void> {
    this.products.set(product.id, product);
  }

  /**
   * Check if product exists
   */
  async exists(id: string): Promise<boolean> {
    return this.products.has(id);
  }

  /**
   * Clear all products (useful for testing)
   */
  clear(): void {
    this.products.clear();
  }

  /**
   * Get total count (useful for testing)
   */
  count(): number {
    return this.products.size;
  }
}
