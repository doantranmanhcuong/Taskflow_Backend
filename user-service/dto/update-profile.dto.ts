import { 
  IsOptional, 
  IsString, 
  IsEmail, 
  MinLength, 
  Matches, 
  ValidateIf,
  IsNotEmpty
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  // QUAN TRỌNG: Nếu có newPassword thì currentPassword là BẮT BUỘC
  @ValidateIf(o => o.newPassword)
  @IsNotEmpty({ message: 'Vui lòng nhập mật khẩu hiện tại' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu hiện tại phải có ít nhất 6 ký tự' })
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).*$/, { // ← THÊM .*$ ĐỂ MATCH FULL STRING
    message: 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số'
  })
  newPassword?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}