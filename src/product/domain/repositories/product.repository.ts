import { Product } from '@/product/domain/entities/product.entity';

/**
 * Pagination result
 */
export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Product Repository Interface
 * Defines data access operations for Product aggregate
 * Infrastructure layer implements this interface
 */
export interface ProductRepository {
  /**
   * Find product by ID
   * @param id - Product ID (UUID)
   * @returns Product or undefined if not found
   */
  findById(id: string): Promise<Product | undefined>;

  /**
   * Find all products with pagination and sorting
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Paginated product list
   */
  findAll(page: number, limit: number): Promise<PaginationResult<Product>>;

  /**
   * Find popular products (last 3 days sales)
   * @param limit - Number of products to return
   * @returns List of popular products
   */
  findPopular(limit: number): Promise<Product[]>;

  /**
   * Save product
   * @param product - Product to save
   */
  save(product: Product): Promise<void>;

  /**
   * Check if product exists
   * @param id - Product ID
   */
  exists(id: string): Promise<boolean>;

  /**
   * Find product by ID with pessimistic lock (FOR UPDATE)
   * 동시성 제어를 위해 비관적 락 사용
   * @param id - Product ID
   * @param tx - Transaction context (optional)
   * @returns Product or undefined if not found
   */
  findByIdForUpdate(id: string, tx?: unknown): Promise<Product | undefined>;

  /**
   * Save product within transaction
   * @param product - Product to save
   * @param tx - Transaction context (optional)
   */
  saveWithTx(product: Product, tx?: unknown): Promise<void>;
}
