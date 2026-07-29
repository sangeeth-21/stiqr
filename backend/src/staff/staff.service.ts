import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStaffDto } from './dto/create-staff.dto'
import { UpdateStaffDto } from './dto/update-staff.dto'

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStaffDto, shopId: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email || '__no_email__' },
          { phone: dto.phone || '__no_phone__' },
        ],
        shopId,
        deletedAt: null,
      },
    })
    if (existingUser) throw new ConflictException('Staff with this email or phone already exists')

    const hashedPassword = await argon2.hash(dto.password)

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        role: dto.role || 'STAFF',
        shopId,
      },
    })

    const employee = await this.prisma.employee.create({
      data: {
        userId: user.id,
        shopId,
        branchId: dto.branchId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        designation: dto.designation,
        salary: dto.salary,
        status: 'ACTIVE',
      },
    })

    return { user, employee }
  }

  async findAll(shopId: string, query: { search?: string; page?: number; limit?: number; status?: string }) {
    const { search, page = 1, limit = 20, status } = query
    const skip = (page - 1) * limit
    const where: any = { shopId, deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }
    if (status) where.status = status
    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { branch: true },
      }),
      this.prisma.employee.count({ where }),
    ])
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async findById(id: string, shopId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, shopId, deletedAt: null },
      include: { branch: true },
    })
    if (!employee) throw new NotFoundException('Staff not found')
    return employee
  }

  async update(id: string, dto: UpdateStaffDto, shopId: string) {
    const staff = await this.findById(id, shopId)
    const { password, ...rest } = dto
    const employee = await this.prisma.employee.update({ where: { id }, data: rest })
    if (password && staff.userId) {
      const hashedPassword = await argon2.hash(password)
      await this.prisma.user.update({ where: { id: staff.userId }, data: { password: hashedPassword } })
    }
    return employee
  }

  async delete(id: string, shopId: string) {
    const staff = await this.findById(id, shopId)
    const employee = await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'TERMINATED' },
    })
    if (staff.userId) {
      await this.prisma.user.update({ where: { id: staff.userId }, data: { deletedAt: new Date() } })
    }
    return employee
  }

  async activate(id: string, shopId: string) {
    await this.findById(id, shopId)
    return this.prisma.employee.update({ where: { id }, data: { status: 'ACTIVE' } })
  }

  async suspend(id: string, shopId: string) {
    await this.findById(id, shopId)
    return this.prisma.employee.update({ where: { id }, data: { status: 'SUSPENDED' } })
  }

  async resetPassword(id: string, shopId: string, newPassword: string) {
    const staff = await this.findById(id, shopId)
    const hashedPassword = await argon2.hash(newPassword)
    await this.prisma.user.update({
      where: { id: staff.userId },
      data: { password: hashedPassword },
    })
    return { message: 'Password reset successfully' }
  }
}
