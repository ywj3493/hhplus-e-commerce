import { IsString, IsNotEmpty } from 'class-validator';

export class GetCartItemParamDto {
  @IsString()
  @IsNotEmpty({ message: '장바구니 아이템 ID는 필수입니다.' })
  id: string;
}
