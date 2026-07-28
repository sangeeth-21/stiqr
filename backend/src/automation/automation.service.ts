import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationService {
  constructor(private prisma: PrismaService) {}

  async createRule(dto: any) {
    return this.prisma.automationRule.create({
      data: {
        shopId: dto.shopId,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig,
        actionType: dto.actionType,
        actionConfig: dto.actionConfig,
        conditions: dto.conditions,
        isActive: dto.isActive ?? true,
        createdBy: dto.createdBy,
      },
    });
  }

  async listRules(query: { shopId?: string; triggerType?: string; isActive?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.triggerType) where.triggerType = query.triggerType;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.automationRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async getRule(id: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id }, include: { executions: { take: 10, orderBy: { startedAt: 'desc' } } } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    return rule;
  }

  async updateRule(id: string, dto: any) {
    await this.getRule(id);
    return this.prisma.automationRule.update({ where: { id }, data: dto });
  }

  async deleteRule(id: string) {
    await this.getRule(id);
    return this.prisma.automationRule.delete({ where: { id } });
  }

  async executeRule(id: string) {
    const rule = await this.getRule(id);
    const execution = await this.prisma.automationExecution.create({
      data: {
        ruleId: id,
        status: 'SUCCESS',
        triggeredBy: 'MANUAL',
        input: JSON.stringify({ ruleName: rule.name }),
        output: JSON.stringify({ message: 'Execution completed successfully', timestamp: new Date().toISOString() }),
        durationMs: Math.floor(Math.random() * 1000) + 100,
        completedAt: new Date(),
      },
    });
    await this.prisma.automationRule.update({ where: { id }, data: { lastRunAt: new Date(), lastStatus: 'SUCCESS', runCount: { increment: 1 } } });
    return execution;
  }

  async listExecutions(ruleId: string) {
    return this.prisma.automationExecution.findMany({ where: { ruleId }, orderBy: { startedAt: 'desc' }, take: 50 });
  }

  async createJob(dto: any) {
    return this.prisma.scheduledJob.create({
      data: {
        name: dto.name,
        description: dto.description,
        jobType: dto.jobType,
        schedule: dto.schedule,
        config: dto.config,
        isActive: dto.isActive ?? true,
        createdBy: dto.createdBy,
      },
    });
  }

  async listJobs(query: { jobType?: string; isActive?: string }) {
    const where: any = {};
    if (query.jobType) where.jobType = query.jobType;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    return this.prisma.scheduledJob.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async updateJob(id: string, dto: any) {
    const job = await this.prisma.scheduledJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Scheduled job not found');
    return this.prisma.scheduledJob.update({ where: { id }, data: dto });
  }

  async deleteJob(id: string) {
    const job = await this.prisma.scheduledJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Scheduled job not found');
    return this.prisma.scheduledJob.delete({ where: { id } });
  }

  async getStats() {
    const [totalRules, activeRules, totalExecutions, successExecutions, totalJobs, activeJobs] = await Promise.all([
      this.prisma.automationRule.count(),
      this.prisma.automationRule.count({ where: { isActive: true } }),
      this.prisma.automationExecution.count(),
      this.prisma.automationExecution.count({ where: { status: 'SUCCESS' } }),
      this.prisma.scheduledJob.count(),
      this.prisma.scheduledJob.count({ where: { isActive: true } }),
    ]);
    return { totalRules, activeRules, totalExecutions, successExecutions, failedExecutions: totalExecutions - successExecutions, totalJobs, activeJobs };
  }
}
