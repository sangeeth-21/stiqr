import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto, QueryEmployeeDto, CreateAttendanceDto, CreateLeaveDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const existing = await this.prisma.employee.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Employee with this email already exists');

    return this.prisma.employee.create({
      data: {
        shopId: dto.shopId,
        branchId: dto.branchId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        designation: dto.designation,
        salary: dto.salary,
        shiftStart: dto.shiftStart,
        shiftEnd: dto.shiftEnd,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : new Date(),
        status: dto.status || 'ACTIVE',
      },
    });
  }

  async findAll(query: QueryEmployeeDto) {
    const { search, branchId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { designation: { contains: search } },
      ];
    }
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id, deletedAt: null } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: 'TERMINATED' } });
  }

  async addAttendance(employeeId: string, dto: CreateAttendanceDto) {
    await this.findOne(employeeId);
    return this.prisma.attendance.create({
      data: {
        employeeId,
        date: new Date(dto.date),
        status: dto.status,
        checkIn: dto.clockIn ? new Date(dto.clockIn) : undefined,
        checkOut: dto.clockOut ? new Date(dto.clockOut) : undefined,
        notes: dto.notes,
      },
    });
  }

  async getAttendance(employeeId: string) {
    await this.findOne(employeeId);
    return this.prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' },
    });
  }

  async addLeave(employeeId: string, dto: CreateLeaveDto) {
    await this.findOne(employeeId);
    return this.prisma.leave.create({
      data: {
        employeeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        type: dto.type,
        notes: dto.reason,
      },
    });
  }

  async getLeaves(employeeId: string) {
    await this.findOne(employeeId);
    return this.prisma.leave.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
    });
  }
}
