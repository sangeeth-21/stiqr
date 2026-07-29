import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateShopDto } from './dto/create-shop.dto'
import { UpdateShopDto } from './dto/update-shop.dto'
import { ShopSettingsDto } from './dto/shop-settings.dto'
import { BusinessHoursDto } from './dto/business-hours.dto'
import { TaxSettingsDto } from './dto/tax-settings.dto'
import { InvoiceSettingsDto } from './dto/invoice-settings.dto'
import { PrinterSettingsDto } from './dto/printer-settings.dto'

@Injectable()
export class ShopsService {
  constructor(private prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  async create(dto: CreateShopDto) {
    const slug = this.generateSlug(dto.name)
    const existing = await this.prisma.shop.findUnique({ where: { slug } })
    if (existing) throw new ConflictException('Shop with this name already exists')
    return this.prisma.shop.create({ data: { ...dto, slug } })
  }

  async findAll(query: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = query
    const skip = (page - 1) * limit
    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }
    const [data, total] = await Promise.all([
      this.prisma.shop.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.shop.count({ where }),
    ])
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findById(id: string) {
    const shop = await this.prisma.shop.findFirst({ where: { id, deletedAt: null } })
    if (!shop) throw new NotFoundException('Shop not found')
    return shop
  }

  async update(id: string, dto: UpdateShopDto) {
    await this.findById(id)
    return this.prisma.shop.update({ where: { id }, data: dto })
  }

  async delete(id: string) {
    await this.findById(id)
    return this.prisma.shop.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
  }

  async findBySlug(slug: string) {
    const shop = await this.prisma.shop.findFirst({ where: { slug, deletedAt: null } })
    if (!shop) throw new NotFoundException('Shop not found')
    return shop
  }

  async updateSettings(id: string, dto: ShopSettingsDto) {
    await this.findById(id)
    const key = 'shop_settings'
    const value = JSON.stringify(dto)
    const existing = await this.prisma.setting.findFirst({ where: { shopId: id, key } })
    if (existing) {
      return this.prisma.setting.update({ where: { id: existing.id }, data: { value } })
    }
    return this.prisma.setting.create({ data: { shopId: id, key, value, group: 'shop_settings' } })
  }

  async updateBusinessHours(id: string, dto: BusinessHoursDto) {
    await this.findById(id)
    return this.prisma.shop.update({ where: { id }, data: { businessHours: JSON.stringify(dto) } })
  }

  async updateTaxSettings(id: string, dto: TaxSettingsDto) {
    await this.findById(id)
    return this.prisma.shop.update({ where: { id }, data: { taxConfig: JSON.stringify(dto) } })
  }

  async updateInvoiceSettings(id: string, dto: InvoiceSettingsDto) {
    await this.findById(id)
    return this.prisma.shop.update({ where: { id }, data: { invoiceTemplate: JSON.stringify(dto) } })
  }

  async updatePrinterSettings(id: string, dto: PrinterSettingsDto) {
    await this.findById(id)
    const key = 'printer_settings'
    const value = JSON.stringify(dto)
    const existing = await this.prisma.setting.findFirst({ where: { shopId: id, key } })
    if (existing) {
      return this.prisma.setting.update({ where: { id: existing.id }, data: { value } })
    }
    return this.prisma.setting.create({ data: { shopId: id, key, value, group: 'printer' } })
  }

  async uploadLogo(id: string, file: any) {
    await this.findById(id)
    const url = `/uploads/${file.filename}`
    return this.prisma.shop.update({ where: { id }, data: { logo: url } })
  }
}
