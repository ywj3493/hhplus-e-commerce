import { Injectable } from '@nestjs/common';
import {
  ProductRepository,
  PaginationResult,
} from '@/product/domain/repositories/product.repository';
import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * ProductPrismaRepository
 * Prisma를 사용한 Product Repository 구현체
 *
 * 주요 기능:
 * - Product Aggregate (Product + ProductOptions + Stock) 조회
 * - 재고 관리 (분산락은 서비스 레이어에서 처리)
 */
@Injectable()
export class ProductPrismaRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ID로 상품 조회 (옵션 및 재고 포함)
   * @param id - 상품 ID
   * @returns Product 애그리거트 또는 undefined
   */
  async findById(id: string): Promise<Product | undefined> {
    const productModel = await this.prisma.product.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            stocks: true,
          },
        },
      },
    });

    if (!productModel) {
      return undefined;
    }

    return this.toDomain(productModel);
  }

  /**
   * 전체 상품 조회 (페이지네이션)
   * @param page - 페이지 번호 (1-indexed)
   * @param limit - 페이지당 항목 수
   * @returns 페이지네이션 결과
   */
  async findAll(page: number, limit: number): Promise<PaginationResult<Product>> {
    const skip = (page - 1) * limit;

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          options: {
            include: {
              stocks: true,
            },
          },
        },
      }),
      this.prisma.product.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: products.map((p) => this.toDomain(p)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * 인기 상품 조회 (최근 3일 판매량 기준)
   * TODO: 판매 이력 테이블 구현 후 실제 판매량 집계
   * 현재는 임시로 최신순 정렬
   * @param limit - 조회할 상품 수
   * @returns 인기 상품 목록
   */
  async findPopular(limit: number): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        options: {
          include: {
            stocks: true,
          },
        },
      },
    });

    return products.map((p) => this.toDomain(p));
  }

  /**
   * 상품 저장 (생성 또는 업데이트)
   * Product와 관련된 Stock 정보도 함께 저장
   * @param product - Product 도메인 엔티티
   */
  async save(product: Product): Promise<void> {
    const data = {
      name: product.name,
      description: product.description,
      price: product.price.amount,
      imageUrl: product.imageUrl,
      categoryId: product.categoryId,
      hasOptions: product.options.length > 0,
      updatedAt: new Date(),
    };

    // 트랜잭션으로 Product와 Stock을 함께 업데이트
    await this.prisma.$transaction(async (tx) => {
      // Product 저장
      await tx.product.upsert({
        where: { id: product.id },
        update: data,
        create: {
          id: product.id,
          ...data,
          createdAt: product.createdAt,
        },
      });

      // 각 옵션의 Stock 업데이트
      for (const option of product.options) {
        const stock = option.stock;
        await tx.stock.update({
          where: { id: stock.id },
          data: {
            availableQuantity: stock.availableQuantity,
            reservedQuantity: stock.reservedQuantity,
            soldQuantity: stock.soldQuantity,
            version: stock.version,
            updatedAt: new Date(),
          },
        });
      }
    });
  }

  /**
   * 상품 존재 여부 확인
   * @param id - 상품 ID
   * @returns 존재 여부
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id },
    });
    return count > 0;
  }

  /**
   * ID로 상품 조회 (비관적 락 - FOR UPDATE)
   * 동시성 제어를 위해 트랜잭션 내에서 사용
   * @param id - 상품 ID
   * @param tx - 트랜잭션 컨텍스트
   * @returns Product 애그리거트 또는 undefined
   */
  async findByIdForUpdate(id: string, tx?: unknown): Promise<Product | undefined> {
    const prisma = (tx || this.prisma) as PrismaService;

    // Product FOR UPDATE 락 획득
    const productRows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string;
        price: Prisma.Decimal;
        imageUrl: string | null;
        categoryId: string | null;
        hasOptions: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`SELECT * FROM products WHERE id = ${id} FOR UPDATE`;

    if (!productRows || productRows.length === 0) {
      return undefined;
    }

    const productRow = productRows[0];

    // 옵션 및 Stock 조회 (Product가 잠겨있으므로 추가 락 불필요)
    const options = await prisma.productOption.findMany({
      where: { productId: id },
      include: {
        stocks: true,
      },
    });

    // Domain 엔티티로 변환
    const productOptions = options.map((optionModel) => {
      const stockModel = optionModel.stocks[0];
      if (!stockModel) {
        throw new Error(`옵션 ${optionModel.id}에 재고 정보가 없습니다`);
      }

      const stock = Stock.create(
        stockModel.id,
        stockModel.productId,
        stockModel.productOptionId,
        stockModel.totalQuantity,
        stockModel.availableQuantity,
        stockModel.reservedQuantity,
        stockModel.soldQuantity,
        stockModel.version,
      );

      return ProductOption.create(
        optionModel.id,
        optionModel.productId,
        optionModel.type,
        optionModel.name,
        Price.from(Number(optionModel.additionalPrice)),
        stock,
        optionModel.createdAt,
        optionModel.updatedAt,
      );
    });

    return Product.create(
      productRow.id,
      productRow.name,
      Price.from(Number(productRow.price)),
      productRow.description,
      productRow.imageUrl,
      productRow.categoryId,
      productOptions,
      productRow.createdAt,
      productRow.updatedAt,
    );
  }

  /**
   * 상품 저장 (트랜잭션 컨텍스트 내에서)
   * @param product - Product 도메인 엔티티
   * @param tx - 트랜잭션 컨텍스트
   */
  async saveWithTx(product: Product, tx?: unknown): Promise<void> {
    const prisma = (tx || this.prisma) as PrismaService;

    const data = {
      name: product.name,
      description: product.description,
      price: product.price.amount,
      imageUrl: product.imageUrl,
      categoryId: product.categoryId,
      hasOptions: product.options.length > 0,
      updatedAt: new Date(),
    };

    // Product 저장
    await prisma.product.upsert({
      where: { id: product.id },
      update: data,
      create: {
        id: product.id,
        ...data,
        createdAt: product.createdAt,
      },
    });

    // 각 옵션의 Stock 업데이트
    for (const option of product.options) {
      const stock = option.stock;
      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          availableQuantity: stock.availableQuantity,
          reservedQuantity: stock.reservedQuantity,
          soldQuantity: stock.soldQuantity,
          version: stock.version,
          updatedAt: new Date(),
        },
      });
    }
  }

  /**
   * 재고 예약
   * 동시성 제어는 서비스 레이어의 분산락(@DistributedLock)에서 처리
   *
   * @param stockId - 재고 ID
   * @param quantity - 예약할 수량
   * @throws Error - 재고 부족 또는 유효하지 않은 수량
   */
  async reserveStock(stockId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error('예약 수량은 양수여야 합니다');
    }

    // 1. 현재 재고 조회
    const stockModel = await this.prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stockModel) {
      throw new Error(`재고를 찾을 수 없습니다: ${stockId}`);
    }

    // 2. 재고 부족 검증
    if (stockModel.availableQuantity < quantity) {
      throw new Error(
        `재고가 부족합니다. 요청: ${quantity}, 가용: ${stockModel.availableQuantity}`,
      );
    }

    // 3. 재고 업데이트 (분산락으로 동시성 보장)
    await this.prisma.stock.update({
      where: { id: stockId },
      data: {
        availableQuantity: { decrement: quantity },
        reservedQuantity: { increment: quantity },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 예약된 재고 복원 (예: 주문 취소 시)
   * 동시성 제어는 서비스 레이어의 분산락(@DistributedLock)에서 처리
   *
   * @param stockId - 재고 ID
   * @param quantity - 복원할 수량
   * @throws Error - 예약 수량 초과 또는 유효하지 않은 수량
   */
  async releaseStock(stockId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error('복원 수량은 양수여야 합니다');
    }

    // 1. 현재 재고 조회
    const stockModel = await this.prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stockModel) {
      throw new Error(`재고를 찾을 수 없습니다: ${stockId}`);
    }

    // 2. 예약 수량 검증
    if (stockModel.reservedQuantity < quantity) {
      throw new Error(
        `복원 수량이 예약 수량을 초과합니다. 요청: ${quantity}, 예약: ${stockModel.reservedQuantity}`,
      );
    }

    // 3. 재고 업데이트 (분산락으로 동시성 보장)
    await this.prisma.stock.update({
      where: { id: stockId },
      data: {
        availableQuantity: { increment: quantity },
        reservedQuantity: { decrement: quantity },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 예약된 재고를 판매로 확정 (예: 결제 완료 시)
   * 동시성 제어는 서비스 레이어의 분산락(@DistributedLock)에서 처리
   *
   * @param stockId - 재고 ID
   * @param quantity - 판매 확정할 수량
   * @throws Error - 예약 수량 초과 또는 유효하지 않은 수량
   */
  async confirmStock(stockId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error('판매 확정 수량은 양수여야 합니다');
    }

    // 1. 현재 재고 조회
    const stockModel = await this.prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stockModel) {
      throw new Error(`재고를 찾을 수 없습니다: ${stockId}`);
    }

    // 2. 예약 수량 검증
    if (stockModel.reservedQuantity < quantity) {
      throw new Error(
        `판매 확정 수량이 예약 수량을 초과합니다. 요청: ${quantity}, 예약: ${stockModel.reservedQuantity}`,
      );
    }

    // 3. 재고 업데이트 (분산락으로 동시성 보장)
    await this.prisma.stock.update({
      where: { id: stockId },
      data: {
        reservedQuantity: { decrement: quantity },
        soldQuantity: { increment: quantity },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Prisma 모델을 Domain 엔티티로 변환
   * @param model - Prisma Product 모델 (옵션 및 재고 포함)
   * @returns Product 도메인 엔티티
   */
  private toDomain(
    model: Prisma.ProductGetPayload<{
      include: {
        options: {
          include: {
            stocks: true;
          };
        };
      };
    }>,
  ): Product {
    // ProductOption 엔티티 생성
    const options = model.options.map((optionModel) => {
      // 각 옵션에는 하나의 Stock만 있어야 함
      const stockModel = optionModel.stocks[0];
      if (!stockModel) {
        throw new Error(`옵션 ${optionModel.id}에 재고 정보가 없습니다`);
      }

      const stock = Stock.create(
        stockModel.id,
        stockModel.productId,
        stockModel.productOptionId,
        stockModel.totalQuantity,
        stockModel.availableQuantity,
        stockModel.reservedQuantity,
        stockModel.soldQuantity,
        stockModel.version,
      );

      return ProductOption.create(
        optionModel.id,
        optionModel.productId,
        optionModel.type,
        optionModel.name,
        Price.from(Number(optionModel.additionalPrice)),
        stock,
        optionModel.createdAt,
        optionModel.updatedAt,
      );
    });

    // Product 엔티티 생성
    return Product.create(
      model.id,
      model.name,
      Price.from(Number(model.price)),
      model.description,
      model.imageUrl,
      model.categoryId,
      options,
      model.createdAt,
      model.updatedAt,
    );
  }
}
