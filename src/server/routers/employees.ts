import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  employees, salaryStructures, attendanceRecords,
  commissionRules, salaryPayments, employeeSupplierLinks,
  financialEntries, orders,
} from "../db/schema";
import { eq, and, gte, lte, desc, asc, sql, inArray, isNull } from "drizzle-orm";

const todayStr = () => new Date().toISOString().slice(0, 10);

export const employeesRouter = createTRPCRouter({

  // ── EMPLOYEES ─────────────────────────────────────────────────────────────

  list: protectedProcedure
    .input(z.object({ includeInactive: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.query.employees.findMany({
        where: input.includeInactive ? undefined : eq(employees.status, "active"),
        orderBy: [asc(employees.name)],
        with: {
          salaryStructures: {
            where: eq(salaryStructures.isActive, true),
            limit: 1,
          },
        },
      });
      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.employees.findFirst({
        where: eq(employees.id, input.id),
        with: {
          salaryStructures: { orderBy: [desc(salaryStructures.createdAt)] },
          supplierLinks: { with: { supplier: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(z.object({
      name:           z.string().min(1),
      employeeCode:   z.string().min(1),
      phone:          z.string().optional(),
      email:          z.string().email().optional().or(z.literal("")),
      address:        z.string().optional(),
      department:     z.string().optional(),
      designation:    z.string().optional(),
      employmentType: z.enum(["full_time", "part_time", "contract"]),
      joinDate:       z.string(),
      userId:         z.string().optional(),
      photoUrl:       z.string().optional(),
      notes:          z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(employees).values({
        ...input,
        joinDate: input.joinDate as unknown as Date,
      });
      return row;
    }),

  update: protectedProcedure
    .input(z.object({
      id:             z.string(),
      name:           z.string().min(1).optional(),
      phone:          z.string().optional(),
      email:          z.string().optional(),
      address:        z.string().optional(),
      department:     z.string().optional(),
      designation:    z.string().optional(),
      employmentType: z.enum(["full_time", "part_time", "contract"]).optional(),
      joinDate:       z.string().optional(),
      status:         z.enum(["active", "inactive", "terminated"]).optional(),
      userId:         z.string().optional(),
      photoUrl:       z.string().optional(),
      notes:          z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await ctx.db.update(employees).set({
        ...data,
        joinDate: data.joinDate ? (data.joinDate as unknown as Date) : undefined,
        updatedAt: new Date(),
      }).where(eq(employees.id, id));
    }),

  // ── SALARY STRUCTURES ─────────────────────────────────────────────────────

  upsertSalaryStructure: protectedProcedure
    .input(z.object({
      employeeId:         z.string(),
      basicSalary:        z.string(),
      housingAllowance:   z.string().default("0"),
      transportAllowance: z.string().default("0"),
      otherAllowances:    z.string().default("0"),
      epfDeduction:       z.string().default("0"),
      etfDeduction:       z.string().default("0"),
      otherDeductions:    z.string().default("0"),
      effectiveFrom:      z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Deactivate previous structures
      await ctx.db.update(salaryStructures)
        .set({ isActive: false })
        .where(and(eq(salaryStructures.employeeId, input.employeeId), eq(salaryStructures.isActive, true)));
      // Insert new
      await ctx.db.insert(salaryStructures).values({
        ...input,
        effectiveFrom: input.effectiveFrom as unknown as Date,
      });
    }),

  // ── ATTENDANCE ────────────────────────────────────────────────────────────

  getAttendanceByDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const allEmployees = await ctx.db.query.employees.findMany({
        where: eq(employees.status, "active"),
        orderBy: [asc(employees.name)],
      });
      const records = await ctx.db.query.attendanceRecords.findMany({
        where: eq(attendanceRecords.date, input.date as unknown as Date),
      });
      const byEmployee: Record<string, typeof records[0]> = {};
      for (const r of records) byEmployee[r.employeeId] = r;
      return allEmployees.map(emp => ({
        employee: emp,
        record: byEmployee[emp.id] ?? null,
      }));
    }),

  getAttendanceSummary: protectedProcedure
    .input(z.object({ employeeId: z.string(), month: z.number(), year: z.number() }))
    .query(async ({ ctx, input }) => {
      const start = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
      const end   = new Date(input.year, input.month, 0).toISOString().slice(0, 10);
      const records = await ctx.db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.employeeId, input.employeeId),
          gte(attendanceRecords.date, start as unknown as Date),
          lte(attendanceRecords.date, end as unknown as Date),
        ),
      });
      const counts = { present: 0, absent: 0, half_day: 0, leave: 0, holiday: 0 };
      for (const r of records) counts[r.status]++;
      const presentDays = counts.present + counts.half_day * 0.5;
      return { ...counts, presentDays, records };
    }),

  upsertAttendance: protectedProcedure
    .input(z.object({
      employeeId: z.string(),
      date:       z.string(),
      status:     z.enum(["present", "absent", "half_day", "leave", "holiday"]),
      checkIn:    z.string().optional(),
      checkOut:   z.string().optional(),
      notes:      z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.employeeId, input.employeeId),
          eq(attendanceRecords.date, input.date as unknown as Date),
        ),
      });
      if (existing) {
        await ctx.db.update(attendanceRecords).set({
          status: input.status,
          checkIn: input.checkIn,
          checkOut: input.checkOut,
          notes: input.notes,
        }).where(eq(attendanceRecords.id, existing.id));
      } else {
        await ctx.db.insert(attendanceRecords).values({
          ...input,
          date: input.date as unknown as Date,
        });
      }
    }),

  bulkUpsertAttendance: protectedProcedure
    .input(z.array(z.object({
      employeeId: z.string(),
      date:       z.string(),
      status:     z.enum(["present", "absent", "half_day", "leave", "holiday"]),
      checkIn:    z.string().optional(),
      checkOut:   z.string().optional(),
      notes:      z.string().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      for (const item of input) {
        const existing = await ctx.db.query.attendanceRecords.findFirst({
          where: and(
            eq(attendanceRecords.employeeId, item.employeeId),
            eq(attendanceRecords.date, item.date as unknown as Date),
          ),
        });
        if (existing) {
          await ctx.db.update(attendanceRecords).set({
            status: item.status,
            checkIn: item.checkIn,
            checkOut: item.checkOut,
            notes: item.notes,
          }).where(eq(attendanceRecords.id, existing.id));
        } else {
          await ctx.db.insert(attendanceRecords).values({
            ...item,
            date: item.date as unknown as Date,
          });
        }
      }
    }),

  // ── COMMISSION RULES ──────────────────────────────────────────────────────

  listCommissionRules: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.commissionRules.findMany({
      where: eq(commissionRules.isActive, true),
      with: { employee: true },
      orderBy: [asc(commissionRules.name)],
    });
  }),

  upsertCommissionRule: protectedProcedure
    .input(z.object({
      id:                 z.string().optional(),
      name:               z.string().min(1),
      employeeId:         z.string().optional(),
      type:               z.enum(["percentage", "fixed_per_order"]),
      rate:               z.string(),
      minSalesThreshold:  z.string().default("0"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        const { id, ...data } = input;
        await ctx.db.update(commissionRules).set(data).where(eq(commissionRules.id, id));
      } else {
        const { id: _id, ...data } = input;
        await ctx.db.insert(commissionRules).values({ ...data, employeeId: data.employeeId ?? null });
      }
    }),

  deleteCommissionRule: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(commissionRules).set({ isActive: false }).where(eq(commissionRules.id, input.id));
    }),

  // ── PAYROLL ───────────────────────────────────────────────────────────────

  calculatePayroll: protectedProcedure
    .input(z.object({ employeeId: z.string(), month: z.number(), year: z.number() }))
    .query(async ({ ctx, input }) => {
      const employee = await ctx.db.query.employees.findFirst({ where: eq(employees.id, input.employeeId) });
      if (!employee) throw new Error("Employee not found");

      const structure = await ctx.db.query.salaryStructures.findFirst({
        where: and(eq(salaryStructures.employeeId, input.employeeId), eq(salaryStructures.isActive, true)),
      });

      // Count working days in month (Mon-Fri)
      const daysInMonth = new Date(input.year, input.month, 0).getDate();
      let workingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(input.year, input.month - 1, d).getDay();
        if (day !== 0 && day !== 6) workingDays++;
      }

      // Get attendance summary
      const start = `${input.year}-${String(input.month).padStart(2, "0")}-01`;
      const end   = new Date(input.year, input.month, 0).toISOString().slice(0, 10);
      const attRecords = await ctx.db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.employeeId, input.employeeId),
          gte(attendanceRecords.date, start as unknown as Date),
          lte(attendanceRecords.date, end as unknown as Date),
        ),
      });
      let presentDays = 0;
      for (const r of attRecords) {
        if (r.status === "present") presentDays += 1;
        if (r.status === "half_day") presentDays += 0.5;
        if (r.status === "leave" || r.status === "holiday") presentDays += 1;
      }

      const basicSalary    = parseFloat(structure?.basicSalary ?? "0");
      const allowances     = parseFloat(structure?.housingAllowance ?? "0")
                           + parseFloat(structure?.transportAllowance ?? "0")
                           + parseFloat(structure?.otherAllowances ?? "0");
      const deductions     = parseFloat(structure?.epfDeduction ?? "0")
                           + parseFloat(structure?.etfDeduction ?? "0")
                           + parseFloat(structure?.otherDeductions ?? "0");
      const dailyRate      = workingDays > 0 ? basicSalary / workingDays : 0;
      const absentDays     = Math.max(0, workingDays - presentDays);
      const attDeduction   = dailyRate * absentDays;

      // Commission: find rules for this employee (or global rules)
      let commission = 0;
      if (employee.userId) {
        const monthStart = new Date(input.year, input.month - 1, 1);
        const monthEnd   = new Date(input.year, input.month, 0, 23, 59, 59);
        const salesRows  = await ctx.db
          .select({ total: sql<string>`SUM(${orders.total})`, count: sql<number>`COUNT(*)` })
          .from(orders)
          .where(and(
            eq(orders.clerkUserId, employee.userId),
            eq(orders.status, "completed"),
            gte(orders.createdAt, monthStart),
            lte(orders.createdAt, monthEnd),
          ));
        const totalSales  = parseFloat(salesRows[0]?.total ?? "0");
        const orderCount  = Number(salesRows[0]?.count ?? 0);

        const rules = await ctx.db.query.commissionRules.findMany({
          where: and(
            eq(commissionRules.isActive, true),
            sql`(${commissionRules.employeeId} = ${input.employeeId} OR ${commissionRules.employeeId} IS NULL)`,
          ),
        });
        for (const rule of rules) {
          const minThreshold = parseFloat(rule.minSalesThreshold ?? "0");
          if (totalSales >= minThreshold) {
            if (rule.type === "percentage") {
              commission += totalSales * (parseFloat(rule.rate) / 100);
            } else {
              commission += orderCount * parseFloat(rule.rate);
            }
          }
        }
      }

      const grossPay = basicSalary + allowances + commission - attDeduction;
      const netPay   = grossPay - deductions;

      return {
        workingDays, presentDays, basicSalary, allowances, deductions,
        attendanceDeduction: attDeduction, commission, bonus: 0,
        grossPay, netPay,
        structure: structure ?? null,
      };
    }),

  listPayroll: protectedProcedure
    .input(z.object({ month: z.number(), year: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.salaryPayments.findMany({
        where: and(eq(salaryPayments.month, input.month), eq(salaryPayments.year, input.year)),
        with: { employee: true },
        orderBy: [asc(salaryPayments.employeeId)],
      });
    }),

  savePayrollDraft: protectedProcedure
    .input(z.object({
      employeeId:          z.string(),
      month:               z.number(),
      year:                z.number(),
      workingDays:         z.number(),
      presentDays:         z.string(),
      basicSalary:         z.string(),
      allowances:          z.string(),
      deductions:          z.string(),
      attendanceDeduction: z.string(),
      commission:          z.string(),
      bonus:               z.string().default("0"),
      grossPay:            z.string(),
      netPay:              z.string(),
      notes:               z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Remove any existing draft for this employee/month/year
      await ctx.db.delete(salaryPayments).where(and(
        eq(salaryPayments.employeeId, input.employeeId),
        eq(salaryPayments.month, input.month),
        eq(salaryPayments.year, input.year),
        eq(salaryPayments.status, "draft"),
      ));
      await ctx.db.insert(salaryPayments).values({ ...input, status: "draft" });
    }),

  approvePayroll: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(salaryPayments)
        .set({ status: "approved", updatedAt: new Date() })
        .where(eq(salaryPayments.id, input.id));
    }),

  processPayment: protectedProcedure
    .input(z.object({ id: z.string(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.query.salaryPayments.findFirst({
        where: eq(salaryPayments.id, input.id),
        with: { employee: true },
      });
      if (!payment) throw new Error("Payment record not found");
      if (payment.status === "paid") throw new Error("Already paid");

      // Create a financial entry for the salary expense
      const [financeRow] = await ctx.db.insert(financialEntries).values({
        type:        "expense",
        amount:      payment.netPay,
        category:    "Salaries",
        description: `Salary: ${payment.employee.name} — ${String(payment.month).padStart(2, "0")}/${payment.year}${input.notes ? " — " + input.notes : ""}`,
        date:        new Date(),
      });

      await ctx.db.update(salaryPayments)
        .set({
          status:         "paid",
          paidAt:         new Date(),
          financeEntryId: String((financeRow as any).insertId ?? ""),
          updatedAt:      new Date(),
        })
        .where(eq(salaryPayments.id, input.id));
    }),

  payrollHistory: protectedProcedure
    .input(z.object({ employeeId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.salaryPayments.findMany({
        where: eq(salaryPayments.employeeId, input.employeeId),
        orderBy: [desc(salaryPayments.year), desc(salaryPayments.month)],
      });
    }),

  // ── SUPPLIER QUOTA LINKS ──────────────────────────────────────────────────

  listSupplierLinks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.employeeSupplierLinks.findMany({
      where: eq(employeeSupplierLinks.isActive, true),
      with: { employee: true, supplier: true },
      orderBy: [asc(employeeSupplierLinks.createdAt)],
    });
  }),

  upsertSupplierLink: protectedProcedure
    .input(z.object({
      id:           z.string().optional(),
      employeeId:   z.string(),
      supplierId:   z.string(),
      quotaAmount:  z.string(),
      quotaPeriod:  z.enum(["monthly", "weekly", "daily"]),
      periodStart:  z.string().optional(),
      notes:        z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        const { id, ...data } = input;
        await ctx.db.update(employeeSupplierLinks).set({
          ...data,
          periodStart: data.periodStart ? (data.periodStart as unknown as Date) : undefined,
          updatedAt: new Date(),
        }).where(eq(employeeSupplierLinks.id, id));
      } else {
        const { id: _id, ...data } = input;
        await ctx.db.insert(employeeSupplierLinks).values({
          ...data,
          periodStart: data.periodStart ? (data.periodStart as unknown as Date) : undefined,
        });
      }
    }),

  updateQuotaUsed: protectedProcedure
    .input(z.object({ id: z.string(), currentUsed: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(employeeSupplierLinks)
        .set({ currentUsed: input.currentUsed, updatedAt: new Date() })
        .where(eq(employeeSupplierLinks.id, input.id));
    }),

  deleteSupplierLink: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(employeeSupplierLinks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(employeeSupplierLinks.id, input.id));
    }),
});
