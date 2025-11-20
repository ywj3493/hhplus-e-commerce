import { Injectable } from '@nestjs/common';
import { ProductRepository, PaginationResult } from '@/product/domain/repositories/product.repository';
import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { PrismaService } from '@/common/infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * ProductPrismaRepository
 * Prisma를 사용한 Product Repository 구현체
 *
 * 주요 기능:
 * - Product Aggregate (Product + ProductOptions + Stock) 조회
 * - 재고 동시성 제어 (SELECT FOR UPDATE)
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

    await this.prisma.product.upsert({
      where: { id: product.id },
      update: data,
      create: {
        id: product.id,
        ...data,
        createdAt: product.createdAt,
      },
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
   * 재고 예약 (비관적 락 사용)
   * SELECT FOR UPDATE를 사용하여 동시성 제어
   *
   * @param stockId - 재고 ID
   * @param quantity - 예약할 수량
   * @throws Error - 재고 부족 또는 유효하지 않은 수량
   */
  async reserveStock(stockId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error('예약 수량은 양수여야 합니다');
    }

    await this.prisma.$transaction(async (tx) => {
      // 비관적 락: SELECT FOR UPDATE
      // 다른 트랜잭션이 이 행을 수정하지 못하도록 잠금
      const stockModel = await tx.$queryRaw<
        Array<{
          id: string;
          productId: string;
          productOptionId: string | null;
          totalQuantity: number;
          availableQuantity: number;
          reservedQuantity: number;
          soldQuantity: number;
        }>
      >`SELECT * FROM stocks WHERE id = ${stockId} FOR UPDATE`;

      if (!stockModel || stockModel.length === 0) {
        throw new Error(`재고를 찾을 수 없습니다: ${stockId}`);
      }

      const stock = stockModel[0];

      // 재고 부족 검증
      if (stock.availableQuantity < quantity) {
        throw new Error(
          `재고가 부족합니다. 요청: ${quantity}, 가용: ${stock.availableQuantity}`,
        );
      }

      // 재고 예약 처리
      await tx.stock.update({
        where: { id: stockId },
        data: {
          availableQuantity: stock.availableQuantity - quantity,
          reservedQuantity: stock.reservedQuantity + quantity,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * 예약된 재고 복원 (예: 주문 취소 시)
   * SELECT FOR UPDATE를 사용하여 동시성 제어
   *
   * @param stockId - 재고 ID
   * @param quantity - 복원할 수량
   * @throws Error - 예약 수량 초과 또는 유효하지 않은 수량
   */
  async releaseStock(stockId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error('복원 수량은 양수여야 합니다');
    }

    await this.prisma.$transaction(async (tx) => {
      // 비관적 락: SELECT FOR UPDATE
      const stockModel = await tx.$queryRaw<
        Array<{
          id: string;
          productId: string;
          productOptionId: string | null;
          totalQuantity: number;
          availableQuantity: number;
          reservedQuantity: number;
          soldQuantity: number;
        }>
      >`SELECT * FROM stocks WHERE id = ${stockId} FOR UPDATE`;

      if (!stockModel || stockModel.length === 0) {
        throw new Error(`재고를 찾을 수 없습니다: ${stockId}`);
      }

      const stock = stockModel[0];

      // 예약 수량 검증
      if (stock.reservedQuantity < quantity) {
        throw new Error(
          `복원 수량이 예약 수량을 초과합니다. 요청: ${quantity}, 예약: ${stock.reservedQuantity}`,
        );
      }

      // 재고 복원 처리
      await tx.stock.update({
        where: { id: stockId },
        data: {
          availableQuantity: stock.availableQuantity + quantity,
          reservedQuantity: stock.reservedQuantity - quantity,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * 예약된 재고를 판매로 확정 (예: 결제 완료 시)
   * SELECT FOR UPDATE를 사용하여 동시성 제어
   *
   * @param stockId - 재고 ID
   * @param quantity - 판매 확정할 수량
   * @throws Error - 예약 수량 초과 또는 유효하지 않은 수량
   */
  async confirmStock(stockId: string, quantity: number): Promise<void> {
    if (quantity <= 0) {
      throw new Error('판매 확정 수량은 양수여야 합니다');
    }

    await this.prisma.$transaction(async (tx) => {
      // 비관적 락: SELECT FOR UPDATE
      const stockModel = await tx.$queryRaw<
        Array<{
          id: string;
          productId: string;
          productOptionId: string | null;
          totalQuantity: number;
          availableQuantity: number;
          reservedQuantity: number;
          soldQuantity: number;
        }>
      >`SELECT * FROM stocks WHERE id = ${stockId} FOR UPDATE`;

      if (!stockModel || stockModel.length === 0) {
        throw new Error(`재고를 찾을 수 없습니다: ${stockId}`);
      }

      const stock = stockModel[0];

      // 예약 수량 검증
      if (stock.reservedQuantity < quantity) {
        throw new Error(
          `판매 확정 수량이 예약 수량을 초과합니다. 요청: ${quantity}, 예약: ${stock.reservedQuantity}`,
        );
      }

      // 재고 판매 확정 처리
      await tx.stock.update({
        where: { id: stockId },
        data: {
          reservedQuantity: stock.reservedQuantity - quantity,
          soldQuantity: stock.soldQuantity + quantity,
          updatedAt: new Date(),
        },
      });
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
