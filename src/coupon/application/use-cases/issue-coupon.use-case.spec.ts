import { IssueCouponUseCase } from '@/coupon/application/use-cases/issue-coupon.use-case';
import { CouponService } from '@/coupon/domain/services/coupon.service';
import { CouponRepository } from '@/coupon/domain/repositories/coupon.repository';
import { UserCouponRepository } from '@/coupon/domain/repositories/user-coupon.repository';
import { Coupon, CouponType } from '@/coupon/domain/entities/coupon.entity';
import { UserCoupon } from '@/coupon/domain/entities/user-coupon.entity';
import {
  CouponNotFoundException,
  CouponAlreadyIssuedException,
  CouponExhaustedException,
  CouponExpiredException,
} from '@/coupon/domain/coupon.exceptions';
import { IssueCouponInput } from '@/coupon/application/dtos/issue-coupon.dto';

describe('IssueCouponUseCase', () => {
  let useCase: IssueCouponUseCase;
  let couponRepository: jest.Mocked<CouponRepository>;
  let userCouponRepository: jest.Mocked<UserCouponRepository>;
  let couponService: CouponService;
  let mockPrisma: any;

  beforeEach(() => {
    // Mock repositories
    couponRepository = {
      findByIdForUpdate: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<CouponRepository>;

    userCouponRepository = {
      existsByUserIdAndCouponId: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
    } as jest.Mocked<UserCouponRepository>;

    // Real service
    couponService = new CouponService();

    // Mock PrismaService with transaction support
    mockPrisma = {
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    // Create use case
    useCase = new IssueCouponUseCase(
      couponRepository,
      userCouponRepository,
      couponService,
      mockPrisma,
    );
  });

  const createTestCoupon = (
    overrides?: Partial<{
      totalQuantity: number;
      issuedQuantity: number;
      validFrom: Date;
      validUntil: Date;
    }>,
  ): Coupon => {
    return Coupon.create(
      '10% 할인 쿠폰',
      '테스트 쿠폰',
      CouponType.PERCENTAGE,
      10,
        null, // minAmount
      overrides?.totalQuantity || 100,
      overrides?.issuedQuantity || 0,
      overrides?.validFrom || new Date('2025-01-01'),
      overrides?.validUntil || new Date('2025-12-31'),
    );
  };

  describe('실행', () => {
    it('유효한 쿠폰을 발급해야 함', async () => {
      // Given
      const userId = 'user-1';
      const couponId = 'coupon-1';
      const input = new IssueCouponInput({ userId, couponId });

      const coupon = createTestCoupon();
      const initialIssuedQuantity = coupon.issuedQuantity;

      couponRepository.findByIdForUpdate.mockResolvedValue(coupon);
      userCouponRepository.existsByUserIdAndCouponId.mockResolvedValue(false);
      couponRepository.save.mockResolvedValue(coupon);
      userCouponRepository.save.mockImplementation(async (uc) => uc);

      // When
      const output = await useCase.execute(input);

      // Then
      expect(output).toBeDefined();
      expect(output.userCouponId).toBeDefined();
      expect(output.couponName).toBe('10% 할인 쿠폰');
      expect(output.discountType).toBe(CouponType.PERCENTAGE);
      expect(output.discountValue).toBe(10);

      // Verify repository calls (트랜잭션 파라미터 포함)
      expect(couponRepository.findByIdForUpdate).toHaveBeenCalledWith(
        couponId,
        mockPrisma,
      );
      expect(
        userCouponRepository.existsByUserIdAndCouponId,
      ).toHaveBeenCalledWith(userId, couponId, mockPrisma);
      expect(couponRepository.save).toHaveBeenCalledWith(coupon, mockPrisma);
      expect(userCouponRepository.save).toHaveBeenCalled();

      // Verify coupon quantity increased
      expect(coupon.issuedQuantity).toBe(initialIssuedQuantity + 1);
    });

    it('존재하지 않는 쿠폰인 경우 예외를 발생시켜야 함', async () => {
      // Given
      const input = new IssueCouponInput({
        userId: 'user-1',
        couponId: 'non-existent',
      });

      couponRepository.findByIdForUpdate.mockResolvedValue(null);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        CouponNotFoundException,
      );
      expect(couponRepository.findByIdForUpdate).toHaveBeenCalled();
      expect(
        userCouponRepository.existsByUserIdAndCouponId,
      ).not.toHaveBeenCalled();
    });

    it('이미 발급받은 쿠폰인 경우 예외를 발생시켜야 함 (BR-COUPON-01)', async () => {
      // Given
      const userId = 'user-1';
      const couponId = 'coupon-1';
      const input = new IssueCouponInput({ userId, couponId });

      const coupon = createTestCoupon();

      couponRepository.findByIdForUpdate.mockResolvedValue(coupon);
      userCouponRepository.existsByUserIdAndCouponId.mockResolvedValue(true); // 이미 발급받음

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        CouponAlreadyIssuedException,
      );
      expect(
        userCouponRepository.existsByUserIdAndCouponId,
      ).toHaveBeenCalledWith(userId, couponId, mockPrisma);
      expect(couponRepository.save).not.toHaveBeenCalled();
      expect(userCouponRepository.save).not.toHaveBeenCalled();
    });

    it('쿠폰이 소진된 경우 예외를 발생시켜야 함 (BR-COUPON-02)', async () => {
      // Given
      const input = new IssueCouponInput({
        userId: 'user-1',
        couponId: 'coupon-1',
      });

      const exhaustedCoupon = createTestCoupon({
        totalQuantity: 100,
        issuedQuantity: 100, // 소진
      });

      couponRepository.findByIdForUpdate.mockResolvedValue(exhaustedCoupon);
      userCouponRepository.existsByUserIdAndCouponId.mockResolvedValue(false);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        CouponExhaustedException,
      );
      expect(couponRepository.save).not.toHaveBeenCalled();
      expect(userCouponRepository.save).not.toHaveBeenCalled();
    });

    it('발급 기간이 아닌 경우 예외를 발생시켜야 함 (BR-COUPON-03)', async () => {
      // Given
      const input = new IssueCouponInput({
        userId: 'user-1',
        couponId: 'coupon-1',
      });

      const expiredCoupon = createTestCoupon({
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2020-12-31'), // 만료
      });

      couponRepository.findByIdForUpdate.mockResolvedValue(expiredCoupon);
      userCouponRepository.existsByUserIdAndCouponId.mockResolvedValue(false);

      // When & Then
      await expect(useCase.execute(input)).rejects.toThrow(
        CouponExpiredException,
      );
      expect(couponRepository.save).not.toHaveBeenCalled();
      expect(userCouponRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('입력 검증', () => {
    it('userId가 없는 경우 예외를 발생시켜야 함', () => {
      // Given & When & Then
      expect(() => {
        new IssueCouponInput({ userId: '', couponId: 'coupon-1' });
      }).toThrow('userId와 couponId는 필수입니다.');
    });

    it('couponId가 없는 경우 예외를 발생시켜야 함', () => {
      // Given & When & Then
      expect(() => {
        new IssueCouponInput({ userId: 'user-1', couponId: '' });
      }).toThrow('userId와 couponId는 필수입니다.');
    });
  });
});
