import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { GenerateOtpDto, VerifyOtpDto, ResendOtpDto } from './dto/otp.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('otp')
@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Public()
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate OTP' })
  generate(@Body() dto: GenerateOtpDto) {
    return this.otpService.generate(dto.email, dto.purpose, dto.type);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP' })
  verify(@Body() dto: VerifyOtpDto) {
    return this.otpService.verify(dto.email, dto.code, dto.purpose);
  }

  @Public()
  @Post('resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP' })
  resend(@Body() dto: ResendOtpDto) {
    return this.otpService.resend(dto.email, dto.purpose);
  }
}
