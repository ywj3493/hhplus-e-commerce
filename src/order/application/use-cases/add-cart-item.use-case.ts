import { Injectable, Inject } from '@nestjs/common';
import type { CartRepository } from '@/order/domain/repositories/cart.repository';
import { IProductRepository, PRODUCT_REPOSITORY } from '@/product/domain/repositories/product.repository';
import { StockManagementService } from '@/product/domain/services/stock-management.service';
import { Cart } from '@/order/domain/entities/cart.entity';
import { ProductNotFoundException } from '@/product/domain/product.exceptions';
import { AddCartItemInput, AddCartItemOutput } from '@/order/application/dtos/add-cart-item.dto';
import { CART_REPOSITORY } from '@/order/domain/repositories/tokens';

/**
 * 장바구니 아이템 추가 Use Case
 *
 * 흐름:
 * 1. 상품 존재 여부 확인
 * 2. 재고 검증 (Product 도메인 서비스)
 * 3. 장바구니 조회 또는 생성
 * 4. Cart.addItem() 호출 (도메인 로직)
 * 5. 장바구니 저장
 * 6. Output DTO 반환
 */
@Injectable()
export class AddCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly stockManagementService: StockManagementService,
  ) {}

  async execute(input: AddCartItemInput): Promise<AddCartItemOutput> {
    // 1. 상품 조회
    const product = await this.productRepository.findById(input.productId);
    if (!product) {
      throw new ProductNotFoundException('상품을 찾을 수 없습니다.');
    }

    // 2. 재고 검증 (Product 도메인 서비스)
    await this.stockManagementService.validateStockAvailability(
      input.productId,
      input.productOptionId,
      input.quantity,
    );

    // 3. 장바구니 조회 또는 생성
    let cart = await this.cartRepository.findByUserId(input.userId);
    if (!cart) {
      cart = Cart.create(input.userId);
    }

    // 4. 아이템 추가 (도메인 로직)
    const itemId = cart.addItem({
      productId: input.productId,
      productName: product.name,
      productOptionId: input.productOptionId,
      price: product.price,
      quantity: input.quantity,
    });

    // 5. 장바구니 저장
    const savedCart = await this.cartRepository.save(cart);

    // 6. Output DTO 반환
    return AddCartItemOutput.from(savedCart, itemId);
  }
}
