import { Injectable } from '@nestjs/common';
import { CartRepository } from '@/order/domain/repositories/cart.repository';
import { Cart } from '@/order/domain/entities/cart.entity';
import { CartItem, CartItemData } from '@/order/domain/entities/cart-item.entity';
import { Price } from '@/product/domain/entities/price.vo';
import { PrismaService } from '@/common/infrastructure/persistance/prisma.service';
import { Cart as PrismaCart, CartItem as PrismaCartItem } from '@prisma/client';

/**
 * Prisma Cart 모델 + CartItem 포함
 */
type PrismaCartWithItems = PrismaCart & {
  items: PrismaCartItem[];
};

/**
 * CartPrismaRepository
 * Prisma를 사용한 Cart Repository 구현체
 *
 * 주요 기능:
 * - Cart Aggregate (Cart + CartItems) 조회
 * - CartItem 동기화 (기존 삭제 + 새로 생성)
 * - Cascade delete 지원
 */
@Injectable()
export class CartPrismaRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자 ID로 장바구니 조회 (CartItem 포함)
   * @param userId - 사용자 ID
   * @returns Cart 애그리거트 또는 null
   */
  async findByUserId(userId: string): Promise<Cart | null> {
    const cartModel = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    });

    if (!cartModel) {
      return null;
    }

    return this.toDomain(cartModel);
  }

  /**
   * 장바구니 저장 (생성 또는 업데이트)
   * CartItem 동기화 전략: 기존 CartItem 모두 삭제 후 현재 items 재생성
   *
   * @param cart - Cart 애그리거트
   * @returns 저장된 Cart
   */
  async save(cart: Cart): Promise<Cart> {
    const items = cart.getItems();

    // 트랜잭션: Cart upsert + CartItem 동기화
    await this.prisma.$transaction(async (tx) => {
      // 1. Cart upsert (userId unique constraint 활용)
      await tx.cart.upsert({
        where: { userId: cart.userId },
        update: {
          updatedAt: cart.updatedAt,
        },
        create: {
          id: cart.id,
          userId: cart.userId,
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt,
        },
      });

      // 2. 기존 CartItem 모두 삭제
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      // 3. 현재 CartItem 재생성
      if (items.length > 0) {
        await tx.cartItem.createMany({
          data: items.map((item) => ({
            id: item.id,
            cartId: cart.id,
            productId: item.productId,
            productName: item.productName,
            productOptionId: item.productOptionId,
            price: item.getPrice().amount,
            quantity: item.quantity,
            createdAt: item.createdAt,
          })),
        });
      }
    });

    // 저장된 Cart 반환 (재조회)
    const saved = await this.findByUserId(cart.userId);
    return saved!;
  }

  /**
   * 사용자의 장바구니 전체 삭제
   * CartItem은 Cascade delete로 자동 삭제됨
   *
   * @param userId - 사용자 ID
   */
  async clearByUserId(userId: string): Promise<void> {
    // CartItem은 onDelete: Cascade이므로 Cart 삭제 시 자동 삭제
    await this.prisma.cart.delete({
      where: { userId },
    });
  }

  /**
   * Prisma 모델 → Domain Entity 변환
   * @param cartModel - Prisma Cart 모델 (CartItem 포함)
   * @returns Cart 도메인 엔티티
   */
  private toDomain(cartModel: PrismaCartWithItems): Cart {
    // CartItem 변환
    const cartItems: CartItem[] = cartModel.items.map((item) =>
      this.toCartItemDomain(item),
    );

    // Cart 재구성
    return Cart.reconstitute({
      id: cartModel.id,
      userId: cartModel.userId,
      items: cartItems,
      createdAt: cartModel.createdAt,
      updatedAt: cartModel.updatedAt,
    });
  }

  /**
   * Prisma CartItem 모델 → CartItem Entity 변환
   * @param itemModel - Prisma CartItem 모델
   * @returns CartItem 도메인 엔티티
   */
  private toCartItemDomain(itemModel: PrismaCartItem): CartItem {
    const itemData: CartItemData = {
      id: itemModel.id,
      cartId: itemModel.cartId,
      productId: itemModel.productId,
      productName: itemModel.productName,
      productOptionId: itemModel.productOptionId,
      price: Price.from(itemModel.price.toNumber()),
      quantity: itemModel.quantity,
      createdAt: itemModel.createdAt,
      updatedAt: new Date(), // CartItem에 updatedAt 필드가 없으므로 createdAt 사용
    };

    return CartItem.reconstitute(itemData);
  }
}
