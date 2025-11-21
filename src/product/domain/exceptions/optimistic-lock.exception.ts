/**
 * 낙관적 락 충돌 예외
 * - 다른 트랜잭션이 동시에 동일한 리소스를 수정한 경우 발생
 * - 재시도 로직의 트리거로 사용됨
 */
export class OptimisticLockException extends Error {
  constructor(message = '리소스가 다른 트랜잭션에 의해 수정되었습니다') {
    super(message);
    this.name = 'OptimisticLockException';
  }
}
