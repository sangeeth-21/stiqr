import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ShopsService } from './shops.service'
import { UpdateShopDto } from './dto/update-shop.dto'
import { ShopSettingsDto } from './dto/shop-settings.dto'
import { BusinessHoursDto } from './dto/business-hours.dto'
import { TaxSettingsDto } from './dto/tax-settings.dto'
import { InvoiceSettingsDto } from './dto/invoice-settings.dto'
import { PrinterSettingsDto } from './dto/printer-settings.dto'

@ApiTags('shop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shop')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user shop' })
  async getMyShop(@CurrentUser() user: any) {
    return this.shopsService.findById(user.shopId)
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user shop' })
  async updateMyShop(@CurrentUser() user: any, @Body() dto: UpdateShopDto) {
    return this.shopsService.update(user.shopId, dto)
  }

  @Post('logo')
  @ApiOperation({ summary: 'Upload shop logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@CurrentUser() user: any, @UploadedFile() file: any) {
    return this.shopsService.uploadLogo(user.shopId, file)
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update shop settings' })
  async updateSettings(@CurrentUser() user: any, @Body() dto: ShopSettingsDto) {
    return this.shopsService.updateSettings(user.shopId, dto)
  }

  @Patch('business-hours')
  @ApiOperation({ summary: 'Update shop business hours' })
  async updateBusinessHours(@CurrentUser() user: any, @Body() dto: BusinessHoursDto) {
    return this.shopsService.updateBusinessHours(user.shopId, dto)
  }

  @Patch('tax')
  @ApiOperation({ summary: 'Update shop tax settings' })
  async updateTaxSettings(@CurrentUser() user: any, @Body() dto: TaxSettingsDto) {
    return this.shopsService.updateTaxSettings(user.shopId, dto)
  }

  @Patch('invoice')
  @ApiOperation({ summary: 'Update shop invoice settings' })
  async updateInvoiceSettings(@CurrentUser() user: any, @Body() dto: InvoiceSettingsDto) {
    return this.shopsService.updateInvoiceSettings(user.shopId, dto)
  }

  @Patch('printer')
  @ApiOperation({ summary: 'Update shop printer settings' })
  async updatePrinterSettings(@CurrentUser() user: any, @Body() dto: PrinterSettingsDto) {
    return this.shopsService.updatePrinterSettings(user.shopId, dto)
  }
}
