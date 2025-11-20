import { GetUserProfileOutput } from '@/user/application/dtos/get-user-profile.dto';

/**
 * UserResponseDto
 * 사용자 정보 조회 API 응답 DTO
 */
export class UserResponseDto {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;

  constructor(
    id: string,
    name: string,
    email: string | null,
    createdAt: string,
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.createdAt = createdAt;
  }

  static from(output: GetUserProfileOutput): UserResponseDto {
    return new UserResponseDto(
      output.id,
      output.name,
      output.email,
      output.createdAt.toISOString(),
    );
  }
}
