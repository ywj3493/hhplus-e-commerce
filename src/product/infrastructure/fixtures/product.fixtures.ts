import { Product } from '@/product/domain/entities/product.entity';
import { ProductOption } from '@/product/domain/entities/product-option.entity';
import { Stock } from '@/product/domain/entities/stock.entity';
import { Price } from '@/product/domain/entities/price.vo';

/**
 * 테스트 및 초기 데이터를 위한 Product 픽스처
 */
export class ProductFixtures {
  /**
   * 옵션과 재고가 포함된 샘플 상품 생성
   */
  static createSampleProducts(): Product[] {
    return [
      // 상품 1: 기본 티셔츠
      Product.create(
        '550e8400-e29b-41d4-a716-446655440001',
        'Basic T-Shirt',
        Price.from(29000),
        'Comfortable cotton t-shirt for everyday wear',
        'https://example.com/images/basic-tshirt.jpg',
        [
          ProductOption.create(
            'opt-001-color-white',
            '550e8400-e29b-41d4-a716-446655440001',
            'Color',
            'White',
            Price.from(0),
            Stock.initialize('stock-001-white', 'opt-001-color-white', 100),
          ),
          ProductOption.create(
            'opt-001-color-black',
            '550e8400-e29b-41d4-a716-446655440001',
            'Color',
            'Black',
            Price.from(0),
            Stock.initialize('stock-001-black', 'opt-001-color-black', 80),
          ),
          ProductOption.create(
            'opt-001-color-navy',
            '550e8400-e29b-41d4-a716-446655440001',
            'Color',
            'Navy',
            Price.from(0),
            Stock.create('stock-001-navy', 'opt-001-color-navy', 50, 0, 30, 20),
          ),
        ],
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T00:00:00Z'),
      ),

      // 상품 2: 프리미엄 후디
      Product.create(
        '550e8400-e29b-41d4-a716-446655440002',
        'Premium Hoodie',
        Price.from(79000),
        'High-quality hoodie with soft interior lining',
        'https://example.com/images/premium-hoodie.jpg',
        [
          ProductOption.create(
            'opt-002-size-s',
            '550e8400-e29b-41d4-a716-446655440002',
            'Size',
            'S',
            Price.from(0),
            Stock.create('stock-002-s', 'opt-002-size-s', 50, 0, 20, 30),
          ),
          ProductOption.create(
            'opt-002-size-m',
            '550e8400-e29b-41d4-a716-446655440002',
            'Size',
            'M',
            Price.from(0),
            Stock.initialize('stock-002-m', 'opt-002-size-m', 60),
          ),
          ProductOption.create(
            'opt-002-size-l',
            '550e8400-e29b-41d4-a716-446655440002',
            'Size',
            'L',
            Price.from(2000),
            Stock.initialize('stock-002-l', 'opt-002-size-l', 40),
          ),
          ProductOption.create(
            'opt-002-size-xl',
            '550e8400-e29b-41d4-a716-446655440002',
            'Size',
            'XL',
            Price.from(2000),
            Stock.initialize('stock-002-xl', 'opt-002-size-xl', 30),
          ),
        ],
        new Date('2024-01-02T00:00:00Z'),
        new Date('2024-01-02T00:00:00Z'),
      ),

      // 상품 3: 클래식 데님 진
      Product.create(
        '550e8400-e29b-41d4-a716-446655440003',
        'Classic Denim Jeans',
        Price.from(59000),
        'Durable denim jeans with classic fit',
        'https://example.com/images/denim-jeans.jpg',
        [
          ProductOption.create(
            'opt-003-size-28',
            '550e8400-e29b-41d4-a716-446655440003',
            'Size',
            '28',
            Price.from(0),
            Stock.initialize('stock-003-28', 'opt-003-size-28', 25),
          ),
          ProductOption.create(
            'opt-003-size-30',
            '550e8400-e29b-41d4-a716-446655440003',
            'Size',
            '30',
            Price.from(0),
            Stock.initialize('stock-003-30', 'opt-003-size-30', 35),
          ),
          ProductOption.create(
            'opt-003-size-32',
            '550e8400-e29b-41d4-a716-446655440003',
            'Size',
            '32',
            Price.from(0),
            Stock.initialize('stock-003-32', 'opt-003-size-32', 40),
          ),
        ],
        new Date('2024-01-03T00:00:00Z'),
        new Date('2024-01-03T00:00:00Z'),
      ),

      // 상품 4: 캐주얼 스니커즈
      Product.create(
        '550e8400-e29b-41d4-a716-446655440004',
        'Casual Sneakers',
        Price.from(89000),
        'Comfortable sneakers for casual wear',
        'https://example.com/images/sneakers.jpg',
        [
          ProductOption.create(
            'opt-004-size-250',
            '550e8400-e29b-41d4-a716-446655440004',
            'Size',
            '250mm',
            Price.from(0),
            Stock.initialize('stock-004-250', 'opt-004-size-250', 20),
          ),
          ProductOption.create(
            'opt-004-size-260',
            '550e8400-e29b-41d4-a716-446655440004',
            'Size',
            '260mm',
            Price.from(0),
            Stock.initialize('stock-004-260', 'opt-004-size-260', 30),
          ),
          ProductOption.create(
            'opt-004-size-270',
            '550e8400-e29b-41d4-a716-446655440004',
            'Size',
            '270mm',
            Price.from(0),
            Stock.initialize('stock-004-270', 'opt-004-size-270', 25),
          ),
        ],
        new Date('2024-01-04T00:00:00Z'),
        new Date('2024-01-04T00:00:00Z'),
      ),

      // 상품 5: 야구 모자
      Product.create(
        '550e8400-e29b-41d4-a716-446655440005',
        'Baseball Cap',
        Price.from(25000),
        'Stylish baseball cap with adjustable strap',
        'https://example.com/images/baseball-cap.jpg',
        [
          ProductOption.create(
            'opt-005-color-black',
            '550e8400-e29b-41d4-a716-446655440005',
            'Color',
            'Black',
            Price.from(0),
            Stock.initialize('stock-005-black', 'opt-005-color-black', 50),
          ),
          ProductOption.create(
            'opt-005-color-beige',
            '550e8400-e29b-41d4-a716-446655440005',
            'Color',
            'Beige',
            Price.from(0),
            Stock.initialize('stock-005-beige', 'opt-005-color-beige', 45),
          ),
        ],
        new Date('2024-01-05T00:00:00Z'),
        new Date('2024-01-05T00:00:00Z'),
      ),

      // 상품 6-15: 페이지네이션 테스트를 위한 추가 상품
      ...Array.from({ length: 10 }, (_, i) => {
        const idx = i + 6;
        const productId = `550e8400-e29b-41d4-a716-4466554400${idx.toString().padStart(2, '0')}`;
        return Product.create(
          productId,
          `Product ${idx}`,
          Price.from(10000 + idx * 1000),
          `Description for product ${idx}`,
          `https://example.com/images/product-${idx}.jpg`,
          [
            ProductOption.create(
              `opt-${idx}-default`,
              productId,
              'Default',
              'Standard',
              Price.from(0),
              Stock.initialize(`stock-${idx}-default`, `opt-${idx}-default`, 50),
            ),
          ],
          new Date(`2024-01-${idx.toString().padStart(2, '0')}T00:00:00Z`),
          new Date(`2024-01-${idx.toString().padStart(2, '0')}T00:00:00Z`),
        );
      }),
    ];
  }
}
