import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(query: string, type?: string) {
    const results: Record<string, any[]> = {};

    const searchTypes = type ? [type] : ['product', 'customer', 'sale', 'invoice', 'employee', 'supplier'];

    const promises = searchTypes.map(async (t) => {
      switch (t) {
        case 'product':
          return this.prisma.product.findMany({
            where: { name: { contains: query }, deletedAt: null },
            select: { id: true, name: true, sku: true, sellingPrice: true, status: true },
            take: 20,
          }).then((items) => { results.product = items; });
        case 'customer':
          return this.prisma.customer.findMany({
            where: {
              OR: [
                { name: { contains: query } },
                { email: { contains: query } },
              ],
              deletedAt: null,
            },
            select: { id: true, name: true, email: true, phone: true, walletBalance: true },
            take: 20,
          }).then((items) => { results.customer = items; });
        case 'sale':
          return this.prisma.sale.findMany({
            where: { invoiceNumber: { contains: query } },
            select: { id: true, invoiceNumber: true, total: true, status: true, date: true },
            take: 20,
          }).then((items) => { results.sale = items; });
        case 'invoice':
          return this.prisma.invoice.findMany({
            where: { invoiceNumber: { contains: query } },
            select: { id: true, invoiceNumber: true, total: true, status: true, date: true },
            take: 20,
          }).then((items) => { results.invoice = items; });
        case 'employee':
          return this.prisma.employee.findMany({
            where: { name: { contains: query }, deletedAt: null },
            select: { id: true, name: true, email: true, designation: true, status: true },
            take: 20,
          }).then((items) => { results.employee = items; });
        case 'supplier':
          return this.prisma.supplier.findMany({
            where: { name: { contains: query }, deletedAt: null },
            select: { id: true, name: true, email: true, phone: true, outstandingBalance: true },
            take: 20,
          }).then((items) => { results.supplier = items; });
      }
    });

    await Promise.all(promises);

    return results;
  }

  async suggest(query: string, limit = 10) {
    const [products, customers] = await Promise.all([
      this.prisma.product.findMany({
        where: { name: { contains: query }, deletedAt: null },
        select: { id: true, name: true, sku: true, sellingPrice: true },
        take: limit,
      }),
      this.prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
          ],
          deletedAt: null,
        },
        select: { id: true, name: true, email: true, phone: true },
        take: limit,
      }),
    ]);

    const items = [
      ...products.map((p) => ({ ...p, type: 'product' })),
      ...customers.map((c) => ({ ...c, type: 'customer' })),
    ];

    return items.slice(0, limit);
  }

  async getStats(query: string) {
    const types = ['product', 'customer', 'sale', 'invoice', 'employee', 'supplier'] as const;

    const counts = await Promise.all(
      types.map(async (t) => {
        let count = 0;
        switch (t) {
          case 'product':
            count = await this.prisma.product.count({
              where: { name: { contains: query }, deletedAt: null },
            });
            break;
          case 'customer':
            count = await this.prisma.customer.count({
              where: { OR: [{ name: { contains: query } }, { email: { contains: query } }], deletedAt: null },
            });
            break;
          case 'sale':
            count = await this.prisma.sale.count({
              where: { invoiceNumber: { contains: query } },
            });
            break;
          case 'invoice':
            count = await this.prisma.invoice.count({
              where: { invoiceNumber: { contains: query } },
            });
            break;
          case 'employee':
            count = await this.prisma.employee.count({
              where: { name: { contains: query }, deletedAt: null },
            });
            break;
          case 'supplier':
            count = await this.prisma.supplier.count({
              where: { name: { contains: query }, deletedAt: null },
            });
            break;
        }
        return { type: t, count };
      }),
    );

    const totalResults = counts.reduce((sum, c) => sum + c.count, 0);

    return { query, totalResults, byType: counts };
  }
}
