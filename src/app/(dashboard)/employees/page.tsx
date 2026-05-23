"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Users, Plus, Edit2, Trash2, Check, X, ChevronDown, ChevronUp,
  Calendar, DollarSign, TrendingUp, Link2, UserCheck, Clock,
  AlertCircle, CheckCircle2, XCircle, MinusCircle, Briefcase, Settings2,
} from "lucide-react";
import toast from "react-hot-toast";
import { ImageUpload } from "@/components/ui/image-upload";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt2 = (n: number | string) =>
  Number(n).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const currentMonth = new Date().getMonth() + 1;
const currentYear  = new Date().getFullYear();

const STATUS_COLORS: Record<string, string> = {
  present:  "bg-emerald-100 text-emerald-700",
  absent:   "bg-red-100 text-red-700",
  half_day: "bg-amber-100 text-amber-700",
  leave:    "bg-blue-100 text-blue-700",
  holiday:  "bg-purple-100 text-purple-700",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  present:  <CheckCircle2 size={14} />,
  absent:   <XCircle size={14} />,
  half_day: <MinusCircle size={14} />,
  leave:    <Clock size={14} />,
  holiday:  <AlertCircle size={14} />,
};

// ─── Dept / Designation Manager ──────────────────────────────────────────────
function DeptDesignationManager({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: allSettings } = trpc.settings.getAll.useQuery();
  const save = trpc.settings.upsertMany.useMutation({
    onSuccess: () => { utils.settings.getAll.invalidate(); toast.success("Saved"); },
    onError: (e) => toast.error(e?.message ?? "Failed to save"),
  });

  const parsedDepts = (allSettings?.hrDepartments ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const parsedDesigs = (allSettings?.hrDesignations ?? "").split(",").map(s => s.trim()).filter(Boolean);

  const [depts, setDepts]   = useState<string[]>(parsedDepts);
  const [desigs, setDesigs] = useState<string[]>(parsedDesigs);
  const [newDept, setNewDept]   = useState("");
  const [newDesig, setNewDesig] = useState("");

  const addDept  = () => { const v = newDept.trim(); if (v && !depts.includes(v)) { setDepts(p => [...p, v]); setNewDept(""); } };
  const addDesig = () => { const v = newDesig.trim(); if (v && !desigs.includes(v)) { setDesigs(p => [...p, v]); setNewDesig(""); } };

  return (
    <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wider text-surface-500">Manage Departments &amp; Designations</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Departments */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-surface-700">Departments</p>
          <div className="flex gap-2">
            <input className="input text-sm py-1.5 flex-1" placeholder="e.g. Sales" value={newDept}
              onChange={e => setNewDept(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDept()} />
            <button onClick={addDept} className="btn-primary px-3 py-1.5 text-sm"><Plus size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {depts.map(d => (
              <span key={d} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-surface-200 rounded-lg text-xs font-semibold text-surface-700">
                {d}
                <button onClick={() => setDepts(p => p.filter(x => x !== d))} className="text-surface-300 hover:text-red-500 ml-0.5"><X size={11} /></button>
              </span>
            ))}
            {depts.length === 0 && <p className="text-xs text-surface-300">No departments added yet.</p>}
          </div>
        </div>
        {/* Designations */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-surface-700">Designations</p>
          <div className="flex gap-2">
            <input className="input text-sm py-1.5 flex-1" placeholder="e.g. Manager" value={newDesig}
              onChange={e => setNewDesig(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addDesig()} />
            <button onClick={addDesig} className="btn-primary px-3 py-1.5 text-sm"><Plus size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {desigs.map(d => (
              <span key={d} className="flex items-center gap-1 px-2.5 py-1 bg-white border border-surface-200 rounded-lg text-xs font-semibold text-surface-700">
                {d}
                <button onClick={() => setDesigs(p => p.filter(x => x !== d))} className="text-surface-300 hover:text-red-500 ml-0.5"><X size={11} /></button>
              </span>
            ))}
            {desigs.length === 0 && <p className="text-xs text-surface-300">No designations added yet.</p>}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary px-4 py-1.5 text-sm flex items-center gap-1.5"><X size={14} /> Close</button>
        <button onClick={() => save.mutate({ hrDepartments: depts.join(","), hrDesignations: desigs.join(",") })} disabled={save.isPending}
          className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"><Check size={14} /> Save</button>
      </div>
    </div>
  );
}

// ─── Employee Form ────────────────────────────────────────────────────────────
function EmployeeForm({
  initial, users, departments, designations, onSave, onCancel,
}: {
  initial?: any;
  users: { id: string; name: string }[];
  departments: string[];
  designations: string[];
  onSave: (v: any) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name:           initial?.name           ?? "",
    employeeCode:   initial?.employeeCode   ?? "",
    phone:          initial?.phone          ?? "",
    email:          initial?.email          ?? "",
    address:        initial?.address        ?? "",
    department:     initial?.department     ?? "",
    designation:    initial?.designation    ?? "",
    employmentType: initial?.employmentType ?? "full_time",
    joinDate:       initial?.joinDate       ?? todayStr(),
    status:         initial?.status         ?? "active",
    userId:         initial?.userId         ?? "",
    photoUrl:       initial?.photoUrl       ?? "",
    notes:          initial?.notes          ?? "",
  });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-surface-50 rounded-xl border border-surface-200">
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Name *</label>
        <input className="input text-sm py-1.5" value={f.name} onChange={e => set("name", e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Employee Code *</label>
        <input className="input text-sm py-1.5" placeholder="EMP-001" value={f.employeeCode} onChange={e => set("employeeCode", e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Phone</label>
        <input className="input text-sm py-1.5" value={f.phone} onChange={e => set("phone", e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Email</label>
        <input type="email" className="input text-sm py-1.5" value={f.email} onChange={e => set("email", e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Department</label>
        <select className="input text-sm py-1.5" value={f.department} onChange={e => set("department", e.target.value)}>
          <option value="">— select —</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Designation</label>
        <select className="input text-sm py-1.5" value={f.designation} onChange={e => set("designation", e.target.value)}>
          <option value="">— select —</option>
          {designations.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Employment Type</label>
        <select className="input text-sm py-1.5" value={f.employmentType} onChange={e => set("employmentType", e.target.value)}>
          <option value="full_time">Full Time</option>
          <option value="part_time">Part Time</option>
          <option value="contract">Contract</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Join Date *</label>
        <input type="date" className="input text-sm py-1.5" value={f.joinDate} onChange={e => set("joinDate", e.target.value)} />
      </div>
      {initial && (
        <div>
          <label className="block text-xs font-semibold text-surface-500 mb-1">Status</label>
          <select className="input text-sm py-1.5" value={f.status} onChange={e => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Linked POS User (for commission)</label>
        <select className="input text-sm py-1.5" value={f.userId} onChange={e => set("userId", e.target.value)}>
          <option value="">— None —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-surface-500 mb-1">Address</label>
        <input className="input text-sm py-1.5" value={f.address} onChange={e => set("address", e.target.value)} />
      </div>
      <div className="col-span-2 md:col-span-1">
        <ImageUpload
          label="Profile Photo"
          value={f.photoUrl}
          onChange={url => set("photoUrl", url)}
          bucket="employee-photos"
        />
      </div>
      <div className="col-span-2 md:col-span-3 flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="btn-secondary px-4 py-1.5 text-sm flex items-center gap-1.5"><X size={14} /> Cancel</button>
        <button onClick={() => { if (!f.name.trim() || !f.employeeCode.trim()) return toast.error("Name and Code required"); onSave(f); }} className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"><Check size={14} /> Save</button>
      </div>
    </div>
  );
}

// ─── Salary Structure Form ────────────────────────────────────────────────────
function SalaryForm({ employeeId, initial, onClose }: { employeeId: string; initial?: any; onClose: () => void }) {
  const [f, setF] = useState({
    basicSalary:        initial?.basicSalary        ?? "0",
    housingAllowance:   initial?.housingAllowance   ?? "0",
    transportAllowance: initial?.transportAllowance ?? "0",
    otherAllowances:    initial?.otherAllowances    ?? "0",
    epfDeduction:       initial?.epfDeduction       ?? "0",
    etfDeduction:       initial?.etfDeduction       ?? "0",
    otherDeductions:    initial?.otherDeductions    ?? "0",
    effectiveFrom:      initial?.effectiveFrom ?? todayStr(),
  });
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));
  const utils = trpc.useUtils();
  const save  = trpc.employees.upsertSalaryStructure.useMutation({
    onSuccess: () => { utils.employees.list.invalidate(); toast.success("Salary structure saved"); onClose(); },
    onError: (e) => toast.error(e?.message ?? "Failed to save salary structure"),
  });

  const gross = [f.basicSalary, f.housingAllowance, f.transportAllowance, f.otherAllowances].reduce((s, v) => s + parseFloat(v || "0"), 0);
  const ded   = [f.epfDeduction, f.etfDeduction, f.otherDeductions].reduce((s, v) => s + parseFloat(v || "0"), 0);

  return (
    <div className="space-y-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
      <p className="text-xs font-bold text-surface-600 uppercase tracking-wider">Salary Components</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Basic Salary", key: "basicSalary" },
          { label: "Housing Allowance", key: "housingAllowance" },
          { label: "Transport Allowance", key: "transportAllowance" },
          { label: "Other Allowances", key: "otherAllowances" },
          { label: "EPF Deduction", key: "epfDeduction" },
          { label: "ETF Deduction", key: "etfDeduction" },
          { label: "Other Deductions", key: "otherDeductions" },
          { label: "Effective From", key: "effectiveFrom", isDate: true },
        ].map(({ label, key, isDate }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-surface-500 mb-1">{label}</label>
            <input type={isDate ? "date" : "number"} min="0" step="0.01" className="input text-sm py-1.5"
              value={(f as any)[key]} onChange={e => set(key, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex gap-6 text-sm px-1">
        <span className="text-surface-500">Gross: <strong className="text-emerald-700">LKR {fmt2(gross)}</strong></span>
        <span className="text-surface-500">Deductions: <strong className="text-red-600">LKR {fmt2(ded)}</strong></span>
        <span className="text-surface-500">Net: <strong className="text-brand-700">LKR {fmt2(gross - ded)}</strong></span>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary px-4 py-1.5 text-sm flex items-center gap-1.5"><X size={14} /> Cancel</button>
        <button onClick={() => save.mutate({ employeeId, ...f })} disabled={save.isPending} className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"><Check size={14} /> Save Structure</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const [tab, setTab] = useState<"staff" | "attendance" | "payroll" | "commission" | "quota">("staff");

  // Staff tab
  const [showForm, setShowForm]     = useState(false);
  const [showDDManager, setShowDDManager] = useState(false);
  const [editId,   setEditId]       = useState<string | null>(null);
  const [salaryEmpId, setSalaryId]  = useState<string | null>(null);

  // Attendance tab
  const [attDate,    setAttDate]    = useState(todayStr());
  const [attChanges, setAttChanges] = useState<Record<string, any>>({});

  // Payroll tab
  const [prMonth, setPrMonth] = useState(currentMonth);
  const [prYear,  setPrYear]  = useState(currentYear);
  const [drafts,  setDrafts]  = useState<Record<string, any>>({});

  // Commission tab
  const [showCRule, setShowCRule] = useState(false);
  const [editCRule, setEditCRule] = useState<any>(null);
  const [cr, setCr] = useState({ name: "", employeeId: "", type: "percentage" as const, rate: "", minSalesThreshold: "0" });

  // Quota tab
  const [showQLinkForm, setShowQLinkForm] = useState(false);
  const [editQLink,     setEditQLink]     = useState<any>(null);
  const [ql, setQl] = useState({ employeeId: "", supplierId: "", quotaAmount: "", quotaPeriod: "monthly" as const, periodStart: todayStr(), notes: "" });

  const utils = trpc.useUtils();

  // Queries
  const { data: empList = [] }     = trpc.employees.list.useQuery({ includeInactive: true });
  const { data: posUsers = [] }    = trpc.users.list.useQuery();
  const { data: suppliers = [] }   = trpc.suppliers.list.useQuery();
  const { data: attData = [] }     = trpc.employees.getAttendanceByDate.useQuery({ date: attDate });
  const { data: payrollList = [] } = trpc.employees.listPayroll.useQuery({ month: prMonth, year: prYear });
  const { data: cRules = [] }      = trpc.employees.listCommissionRules.useQuery();
  const { data: qLinks = [] }      = trpc.employees.listSupplierLinks.useQuery();
  const { data: allSettings }      = trpc.settings.getAll.useQuery();

  const departments  = (allSettings?.hrDepartments  ?? "").split(",").map(s => s.trim()).filter(Boolean);
  const designations = (allSettings?.hrDesignations ?? "").split(",").map(s => s.trim()).filter(Boolean);

  // Mutations
  const onErr = (e: any) => toast.error(e?.message ?? "Something went wrong");

  const createEmp    = trpc.employees.create.useMutation({ onSuccess: () => { utils.employees.list.invalidate(); setShowForm(false); toast.success("Employee added"); }, onError: onErr });
  const updateEmp    = trpc.employees.update.useMutation({ onSuccess: () => { utils.employees.list.invalidate(); setEditId(null); toast.success("Employee updated"); }, onError: onErr });
  const bulkAtt      = trpc.employees.bulkUpsertAttendance.useMutation({ onSuccess: () => { utils.employees.getAttendanceByDate.invalidate(); setAttChanges({}); toast.success("Attendance saved"); }, onError: onErr });
  const saveDraft    = trpc.employees.savePayrollDraft.useMutation({ onSuccess: () => { utils.employees.listPayroll.invalidate(); toast.success("Draft saved"); }, onError: onErr });
  const approvePayroll = trpc.employees.approvePayroll.useMutation({ onSuccess: () => { utils.employees.listPayroll.invalidate(); toast.success("Approved"); }, onError: onErr });
  const processPayment = trpc.employees.processPayment.useMutation({ onSuccess: () => { utils.employees.listPayroll.invalidate(); toast.success("Payment processed and finance entry created"); }, onError: onErr });
  const saveRule     = trpc.employees.upsertCommissionRule.useMutation({ onSuccess: () => { utils.employees.listCommissionRules.invalidate(); setShowCRule(false); setEditCRule(null); toast.success("Rule saved"); }, onError: onErr });
  const deleteRule   = trpc.employees.deleteCommissionRule.useMutation({ onSuccess: () => utils.employees.listCommissionRules.invalidate(), onError: onErr });
  const saveQLink    = trpc.employees.upsertSupplierLink.useMutation({ onSuccess: () => { utils.employees.listSupplierLinks.invalidate(); setShowQLinkForm(false); setEditQLink(null); toast.success("Quota link saved"); }, onError: onErr });
  const delQLink     = trpc.employees.deleteSupplierLink.useMutation({ onSuccess: () => utils.employees.listSupplierLinks.invalidate(), onError: onErr });
  const updateQuota  = trpc.employees.updateQuotaUsed.useMutation({ onSuccess: () => utils.employees.listSupplierLinks.invalidate(), onError: onErr });

  const activeEmps = empList.filter(e => e.status === "active");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Users size={24} className="text-brand-600" /> HR & Payroll
        </h1>
        <p className="text-sm text-surface-400 mt-1">Manage employees, attendance, salary, commission, and supplier quotas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit flex-wrap">
        {([
          { key: "staff",      label: "Staff",           icon: Users },
          { key: "attendance", label: "Attendance",       icon: UserCheck },
          { key: "payroll",    label: "Payroll",          icon: DollarSign },
          { key: "commission", label: "Commission",       icon: TrendingUp },
          { key: "quota",      label: "Supplier Quota",   icon: Link2 },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? "bg-white shadow text-brand-700" : "text-surface-500 hover:text-surface-700"}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── STAFF TAB ── */}
      {tab === "staff" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-surface-500">{activeEmps.length} active · {empList.length} total</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDDManager(p => !p)} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-sm"><Settings2 size={14} /> Manage Depts &amp; Designations</button>
              {!showForm && <button onClick={() => { setShowForm(true); setEditId(null); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus size={15} /> Add Employee</button>}
            </div>
          </div>

          {showDDManager && <DeptDesignationManager onClose={() => setShowDDManager(false)} />}

          {showForm && (
            <EmployeeForm
              users={posUsers as any}
              departments={departments}
              designations={designations}
              onSave={(v) => createEmp.mutate(v)}
              onCancel={() => setShowForm(false)}
            />
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Employee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Basic Salary</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
                  <th className="w-28" />
                </tr>
              </thead>
              <tbody>
                {empList.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-surface-300 text-sm">No employees yet.</td></tr>
                )}
                {empList.map(emp => {
                  const activeSalary = (emp.salaryStructures as any[])?.[0];
                  const isEdit = editId === emp.id;
                  return (
                    <>
                      <tr key={emp.id} className="border-b border-surface-100 hover:bg-surface-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {emp.photoUrl ? (
                              <img src={emp.photoUrl as string} alt={emp.name} className="w-9 h-9 rounded-xl object-cover bg-surface-100 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 text-brand-600 font-bold text-sm">
                                {emp.name[0]?.toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-surface-800">{emp.name}</p>
                              <p className="text-xs text-surface-400">{emp.employeeCode} · {emp.designation ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-surface-600 text-xs">{emp.department ?? "—"}</td>
                        <td className="px-4 py-3 text-surface-500 text-xs capitalize">{emp.employmentType.replace("_", " ")}</td>
                        <td className="px-4 py-3 text-right font-medium text-surface-800">
                          {activeSalary ? `LKR ${fmt2(activeSalary.basicSalary)}` : <span className="text-surface-300 text-xs">Not set</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${emp.status === "active" ? "bg-emerald-100 text-emerald-700" : emp.status === "terminated" ? "bg-red-100 text-red-700" : "bg-surface-100 text-surface-500"}`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button title="Set salary" onClick={() => setSalaryId(salaryEmpId === emp.id ? null : emp.id)} className="p-1.5 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><DollarSign size={13} /></button>
                            <button title="Edit" onClick={() => setEditId(isEdit ? null : emp.id)} className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                      {salaryEmpId === emp.id && (
                        <tr key={`${emp.id}-salary`}>
                          <td colSpan={6} className="px-4 pb-4 pt-1 bg-surface-50/60">
                            <SalaryForm employeeId={emp.id} initial={(emp.salaryStructures as any[])?.[0]} onClose={() => setSalaryId(null)} />
                          </td>
                        </tr>
                      )}
                      {isEdit && (
                        <tr key={`${emp.id}-edit`}>
                          <td colSpan={6} className="px-4 pb-4 pt-1 bg-surface-50/60">
                            <EmployeeForm
                              initial={emp}
                              users={posUsers as any}
                              departments={departments}
                              designations={designations}
                              onSave={(v) => updateEmp.mutate({ id: emp.id, ...v })}
                              onCancel={() => setEditId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ── */}
      {tab === "attendance" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-surface-400" />
              <input type="date" value={attDate} onChange={e => { setAttDate(e.target.value); setAttChanges({}); }} className="input text-sm py-1.5 w-40" />
            </div>
            <div className="flex gap-2 ml-auto">
              {attData.length > 0 && (
                <>
                  <button onClick={() => {
                    const changes: Record<string, any> = {};
                    attData.forEach(({ employee }) => { changes[employee.id] = { ...( attChanges[employee.id] ?? {}), status: "present" }; });
                    setAttChanges(changes);
                  }} className="btn-secondary px-3 py-1.5 text-xs">Mark All Present</button>
                  <button
                    disabled={Object.keys(attChanges).length === 0 || bulkAtt.isPending}
                    onClick={() => {
                      const rows = Object.entries(attChanges).map(([employeeId, val]) => ({ employeeId, date: attDate, ...val }));
                      bulkAtt.mutate(rows);
                    }}
                    className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check size={14} /> Save Attendance
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-surface-50 border-b border-surface-200">
              <p className="text-xs font-bold uppercase tracking-wider text-surface-500">Attendance — {attDate}</p>
            </div>
            {attData.length === 0 ? (
              <div className="p-10 text-center text-surface-300 text-sm">No active employees. Add employees first.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Employee</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-surface-500">Check In</th>
                    <th className="px-4 py-3 text-xs font-semibold text-surface-500">Check Out</th>
                    <th className="px-4 py-3 text-xs font-semibold text-surface-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attData.map(({ employee, record }) => {
                    const current = attChanges[employee.id] ?? (record ? { status: record.status, checkIn: record.checkIn, checkOut: record.checkOut, notes: record.notes } : null);
                    const status  = current?.status ?? null;
                    return (
                      <tr key={employee.id} className="border-b border-surface-100 hover:bg-surface-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-surface-800">{employee.name}</p>
                          <p className="text-xs text-surface-400">{employee.employeeCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={status ?? ""}
                            onChange={e => setAttChanges(p => ({ ...p, [employee.id]: { ...(p[employee.id] ?? {}), status: e.target.value } }))}
                            className={`input text-xs py-1.5 w-36 font-semibold ${status ? STATUS_COLORS[status] : "text-surface-400"}`}
                          >
                            <option value="">— select —</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="half_day">Half Day</option>
                            <option value="leave">Leave</option>
                            <option value="holiday">Holiday</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input type="time" className="input text-xs py-1 w-28"
                            value={current?.checkIn ?? ""} onChange={e => setAttChanges(p => ({ ...p, [employee.id]: { ...(p[employee.id] ?? {}), checkIn: e.target.value } }))} />
                        </td>
                        <td className="px-4 py-3">
                          <input type="time" className="input text-xs py-1 w-28"
                            value={current?.checkOut ?? ""} onChange={e => setAttChanges(p => ({ ...p, [employee.id]: { ...(p[employee.id] ?? {}), checkOut: e.target.value } }))} />
                        </td>
                        <td className="px-4 py-3">
                          <input className="input text-xs py-1 w-32" placeholder="Optional"
                            value={current?.notes ?? ""} onChange={e => setAttChanges(p => ({ ...p, [employee.id]: { ...(p[employee.id] ?? {}), notes: e.target.value } }))} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Legend */}
          <div className="flex gap-3 flex-wrap text-xs text-surface-500">
            {Object.entries(STATUS_COLORS).map(([s, cls]) => (
              <span key={s} className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${cls}`}>
                {STATUS_ICONS[s]} {s.replace("_", " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── PAYROLL TAB ── */}
      {tab === "payroll" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select className="input text-sm py-1.5 w-32" value={prMonth} onChange={e => setPrMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" className="input text-sm py-1.5 w-24" value={prYear} onChange={e => setPrYear(Number(e.target.value))} />
            <span className="text-sm text-surface-400">→ Payroll for {MONTHS[prMonth - 1]} {prYear}</span>
          </div>

          {activeEmps.length === 0 ? (
            <div className="card p-10 text-center text-surface-300 text-sm">Add employees first.</div>
          ) : (
            <div className="space-y-3">
              {activeEmps.map(emp => {
                const existing = payrollList.find(p => p.employeeId === emp.id);
                return (
                  <PayrollRow
                    key={emp.id}
                    employee={emp}
                    month={prMonth}
                    year={prYear}
                    existing={existing}
                    onSaveDraft={(data) => saveDraft.mutate({ employeeId: emp.id, month: prMonth, year: prYear, ...data })}
                    onApprove={(id) => approvePayroll.mutate({ id })}
                    onProcess={(id) => processPayment.mutate({ id })}
                  />
                );
              })}
            </div>
          )}

          {/* Summary */}
          {payrollList.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-3">Payroll Summary — {MONTHS[prMonth - 1]} {prYear}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Net Pay", val: payrollList.reduce((s, p) => s + parseFloat(p.netPay), 0), color: "text-brand-700" },
                  { label: "Total Commission", val: payrollList.reduce((s, p) => s + parseFloat(p.commission), 0), color: "text-emerald-600" },
                  { label: "Paid", val: payrollList.filter(p => p.status === "paid").length, isCnt: true, color: "text-emerald-600" },
                  { label: "Pending", val: payrollList.filter(p => p.status !== "paid").length, isCnt: true, color: "text-amber-600" },
                ].map(item => (
                  <div key={item.label} className="bg-surface-50 rounded-xl p-3">
                    <p className="text-xs text-surface-400">{item.label}</p>
                    <p className={`text-lg font-bold mt-0.5 ${item.color}`}>
                      {item.isCnt ? item.val : `LKR ${fmt2(item.val)}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── COMMISSION TAB ── */}
      {tab === "commission" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">{cRules.length} active rule{cRules.length !== 1 ? "s" : ""}</p>
            {!showCRule && <button onClick={() => { setShowCRule(true); setEditCRule(null); setCr({ name: "", employeeId: "", type: "percentage", rate: "", minSalesThreshold: "0" }); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus size={15} /> New Rule</button>}
          </div>

          {(showCRule || editCRule) && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-semibold text-surface-500 mb-1">Rule Name *</label>
                <input className="input text-sm py-1.5" value={editCRule?.name ?? cr.name} onChange={e => editCRule ? setEditCRule((p: any) => ({ ...p, name: e.target.value })) : setCr(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Apply To</label>
                <select className="input text-sm py-1.5" value={editCRule?.employeeId ?? cr.employeeId} onChange={e => editCRule ? setEditCRule((p: any) => ({ ...p, employeeId: e.target.value })) : setCr(p => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">All Employees</option>
                  {activeEmps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Type</label>
                <select className="input text-sm py-1.5" value={editCRule?.type ?? cr.type} onChange={e => editCRule ? setEditCRule((p: any) => ({ ...p, type: e.target.value })) : setCr(p => ({ ...p, type: e.target.value as any }))}>
                  <option value="percentage">% of Sales</option>
                  <option value="fixed_per_order">Fixed per Order</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Rate {(editCRule?.type ?? cr.type) === "percentage" ? "(%)" : "(LKR / order)"}</label>
                <input type="number" min="0" step="0.01" className="input text-sm py-1.5" value={editCRule?.rate ?? cr.rate} onChange={e => editCRule ? setEditCRule((p: any) => ({ ...p, rate: e.target.value })) : setCr(p => ({ ...p, rate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Min. Sales Threshold (LKR)</label>
                <input type="number" min="0" step="0.01" className="input text-sm py-1.5" value={editCRule?.minSalesThreshold ?? cr.minSalesThreshold} onChange={e => editCRule ? setEditCRule((p: any) => ({ ...p, minSalesThreshold: e.target.value })) : setCr(p => ({ ...p, minSalesThreshold: e.target.value }))} />
              </div>
              <div className="col-span-2 md:col-span-3 flex justify-end gap-2">
                <button onClick={() => { setShowCRule(false); setEditCRule(null); }} className="btn-secondary px-4 py-1.5 text-sm flex items-center gap-1.5"><X size={14} /> Cancel</button>
                <button onClick={() => {
                  const d = editCRule ?? cr;
                  if (!d.name || !d.rate) return toast.error("Name and rate required");
                  saveRule.mutate({ id: editCRule?.id, name: d.name, employeeId: d.employeeId || undefined, type: d.type, rate: d.rate, minSalesThreshold: d.minSalesThreshold });
                }} className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"><Check size={14} /> Save Rule</button>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Rule</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Applies To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Rate</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Min. Threshold</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {cRules.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-surface-300 text-sm">No commission rules yet.</td></tr>}
                {cRules.map(rule => (
                  <tr key={rule.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="px-4 py-3 font-semibold text-surface-800">{rule.name}</td>
                    <td className="px-4 py-3 text-surface-600 text-xs">{(rule.employee as any)?.name ?? <span className="italic text-surface-400">All employees</span>}</td>
                    <td className="px-4 py-3 text-surface-500 text-xs">{rule.type === "percentage" ? "% of Sales" : "Fixed per Order"}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-700">{rule.type === "percentage" ? `${rule.rate}%` : `LKR ${rule.rate}`}</td>
                    <td className="px-4 py-3 text-right text-surface-500 text-xs">{parseFloat(rule.minSalesThreshold ?? "0") > 0 ? `LKR ${fmt2(rule.minSalesThreshold ?? "0")}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setEditCRule({ ...rule, rate: rule.rate, minSalesThreshold: rule.minSalesThreshold ?? "0", employeeId: rule.employeeId ?? "" }); setShowCRule(false); }} className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={12} /></button>
                        <button onClick={() => { if (confirm("Delete rule?")) deleteRule.mutate({ id: rule.id }); }} className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-surface-400 bg-surface-50 rounded-xl px-4 py-3 border border-surface-100">
            Commission is calculated automatically during payroll processing based on completed sales linked to the employee's POS user account. Rules without a specific employee apply to all staff.
          </div>
        </div>
      )}

      {/* ── SUPPLIER QUOTA TAB ── */}
      {tab === "quota" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">Link employees who supply goods to the shop and track their delivery quotas</p>
            {!showQLinkForm && <button onClick={() => { setShowQLinkForm(true); setEditQLink(null); setQl({ employeeId: "", supplierId: "", quotaAmount: "", quotaPeriod: "monthly", periodStart: todayStr(), notes: "" }); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><Plus size={15} /> Add Link</button>}
          </div>

          {(showQLinkForm || editQLink) && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Employee *</label>
                <select className="input text-sm py-1.5" value={editQLink?.employeeId ?? ql.employeeId} onChange={e => editQLink ? setEditQLink((p: any) => ({ ...p, employeeId: e.target.value })) : setQl(p => ({ ...p, employeeId: e.target.value }))}>
                  <option value="">Select employee…</option>
                  {activeEmps.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Supplier *</label>
                <select className="input text-sm py-1.5" value={editQLink?.supplierId ?? ql.supplierId} onChange={e => editQLink ? setEditQLink((p: any) => ({ ...p, supplierId: e.target.value })) : setQl(p => ({ ...p, supplierId: e.target.value }))}>
                  <option value="">Select supplier…</option>
                  {(suppliers as any[]).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Quota Amount (LKR) *</label>
                <input type="number" min="0" step="0.01" className="input text-sm py-1.5" value={editQLink?.quotaAmount ?? ql.quotaAmount} onChange={e => editQLink ? setEditQLink((p: any) => ({ ...p, quotaAmount: e.target.value })) : setQl(p => ({ ...p, quotaAmount: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Quota Period</label>
                <select className="input text-sm py-1.5" value={editQLink?.quotaPeriod ?? ql.quotaPeriod} onChange={e => editQLink ? setEditQLink((p: any) => ({ ...p, quotaPeriod: e.target.value })) : setQl(p => ({ ...p, quotaPeriod: e.target.value as any }))}>
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="daily">Daily</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Period Start</label>
                <input type="date" className="input text-sm py-1.5" value={editQLink?.periodStart ?? ql.periodStart} onChange={e => editQLink ? setEditQLink((p: any) => ({ ...p, periodStart: e.target.value })) : setQl(p => ({ ...p, periodStart: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Notes</label>
                <input className="input text-sm py-1.5" value={editQLink?.notes ?? ql.notes} onChange={e => editQLink ? setEditQLink((p: any) => ({ ...p, notes: e.target.value })) : setQl(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="col-span-2 md:col-span-3 flex justify-end gap-2">
                <button onClick={() => { setShowQLinkForm(false); setEditQLink(null); }} className="btn-secondary px-4 py-1.5 text-sm flex items-center gap-1.5"><X size={14} /> Cancel</button>
                <button onClick={() => {
                  const d = editQLink ?? ql;
                  if (!d.employeeId || !d.supplierId || !d.quotaAmount) return toast.error("Employee, supplier and quota amount required");
                  saveQLink.mutate({ id: editQLink?.id, employeeId: d.employeeId, supplierId: d.supplierId, quotaAmount: d.quotaAmount, quotaPeriod: d.quotaPeriod, periodStart: d.periodStart, notes: d.notes });
                }} className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"><Check size={14} /> Save Link</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {qLinks.length === 0 && !showQLinkForm && (
              <div className="card p-10 text-center text-surface-300">
                <Link2 size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No supplier links yet.</p>
                <p className="text-xs mt-1">Link employees who also supply goods to track their delivery quotas.</p>
              </div>
            )}
            {qLinks.map(link => {
              const pct = parseFloat(link.quotaAmount) > 0 ? (parseFloat(link.currentUsed) / parseFloat(link.quotaAmount)) * 100 : 0;
              const isOver = pct > 100;
              const isNear = pct > 80;
              return (
                <div key={link.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-surface-800">{(link.employee as any)?.name}</p>
                        <span className="text-xs text-surface-400">→</span>
                        <p className="font-semibold text-surface-700">{(link.supplier as any)?.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isOver ? "bg-red-100 text-red-700" : isNear ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {pct.toFixed(0)}% used
                        </span>
                        <span className="text-xs text-surface-400 capitalize">{link.quotaPeriod}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex-1 bg-surface-100 rounded-full h-2 max-w-xs">
                          <div className={`h-2 rounded-full transition-all ${isOver ? "bg-red-500" : isNear ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <p className="text-xs text-surface-500">LKR {fmt2(link.currentUsed)} / {fmt2(link.quotaAmount)}</p>
                      </div>
                      {link.notes && <p className="text-xs text-surface-400 mt-1">{link.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditQLink({ ...link, employeeId: (link.employee as any).id, supplierId: (link.supplier as any).id }); setShowQLinkForm(false); }} className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => { if (confirm("Remove this supplier link?")) delQLink.mutate({ id: link.id }); }} className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {/* Update quota used */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-surface-500">Update used amount:</span>
                    <input type="number" min="0" step="0.01" className="input text-xs py-1 w-32" defaultValue={link.currentUsed}
                      onBlur={e => { if (e.target.value !== link.currentUsed) updateQuota.mutate({ id: link.id, currentUsed: e.target.value }); }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payroll Row (separate component to use its own query) ───────────────────
function PayrollRow({ employee, month, year, existing, onSaveDraft, onApprove, onProcess }: {
  employee: any; month: number; year: number; existing: any;
  onSaveDraft: (d: any) => void; onApprove: (id: string) => void; onProcess: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [bonus, setBonus] = useState(existing?.bonus ?? "0");
  const { data: calc } = trpc.employees.calculatePayroll.useQuery({ employeeId: employee.id, month, year }, { enabled: open });

  const status = existing?.status;
  const statusColor = status === "paid" ? "text-emerald-700 bg-emerald-100" : status === "approved" ? "text-blue-700 bg-blue-100" : "text-amber-700 bg-amber-100";

  const netWithBonus = calc ? (calc.netPay + parseFloat(bonus || "0")).toFixed(2) : existing?.netPay;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Briefcase size={16} className="text-brand-600" />
          </div>
          <div>
            <p className="font-semibold text-surface-800">{employee.name}</p>
            <p className="text-xs text-surface-400">{employee.employeeCode} · {employee.designation ?? employee.employmentType?.replace("_", " ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {existing && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{existing.status}</span>
          )}
          {existing?.netPay && (
            <span className="text-sm font-bold text-brand-700">LKR {fmt2(existing.netPay)}</span>
          )}
          {open ? <ChevronUp size={16} className="text-surface-400" /> : <ChevronDown size={16} className="text-surface-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-surface-100 px-4 py-4 bg-surface-50/60 space-y-4">
          {!calc ? (
            <p className="text-sm text-surface-400">Calculating…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Working Days", val: `${calc.workingDays}` },
                  { label: "Present Days", val: `${calc.presentDays}` },
                  { label: "Basic Salary", val: `LKR ${fmt2(calc.basicSalary)}` },
                  { label: "Allowances", val: `LKR ${fmt2(calc.allowances)}` },
                  { label: "Att. Deduction", val: `-LKR ${fmt2(calc.attendanceDeduction)}`, cls: "text-red-600" },
                  { label: "Statutory Deductions", val: `-LKR ${fmt2(calc.deductions)}`, cls: "text-red-600" },
                  { label: "Commission", val: `LKR ${fmt2(calc.commission)}`, cls: "text-emerald-600" },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-xl p-3 border border-surface-100">
                    <p className="text-xs text-surface-400">{item.label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${item.cls ?? "text-surface-800"}`}>{item.val}</p>
                  </div>
                ))}
                <div className="bg-white rounded-xl p-3 border border-surface-100">
                  <p className="text-xs text-surface-400">Bonus / Extra</p>
                  <input type="number" min="0" step="0.01" className="input text-sm py-1 mt-0.5 w-full"
                    value={bonus} onChange={e => setBonus(e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-brand-50 rounded-xl border border-brand-100">
                <div>
                  <p className="text-xs text-brand-600 font-semibold">Gross Pay</p>
                  <p className="text-lg font-bold text-brand-800">LKR {fmt2(calc.grossPay + parseFloat(bonus || "0"))}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-brand-600 font-semibold">Net Pay (after deductions)</p>
                  <p className="text-2xl font-bold text-brand-700">LKR {fmt2(netWithBonus ?? 0)}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                {(!existing || existing.status === "draft") && (
                  <button onClick={() => onSaveDraft({
                    workingDays: calc.workingDays,
                    presentDays: String(calc.presentDays),
                    basicSalary: String(calc.basicSalary),
                    allowances:  String(calc.allowances),
                    deductions:  String(calc.deductions),
                    attendanceDeduction: String(calc.attendanceDeduction),
                    commission:  String(calc.commission),
                    bonus:       bonus || "0",
                    grossPay:    String(calc.grossPay + parseFloat(bonus || "0")),
                    netPay:      String(netWithBonus ?? 0),
                  })} className="btn-secondary px-4 py-1.5 text-sm flex items-center gap-1.5"><Check size={14} /> Save Draft</button>
                )}
                {existing?.status === "draft" && (
                  <button onClick={() => onApprove(existing.id)} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold flex items-center gap-1.5"><CheckCircle2 size={14} /> Approve</button>
                )}
                {existing?.status === "approved" && (
                  <button onClick={() => { if (confirm(`Process payment of LKR ${fmt2(existing.netPay)} for ${employee.name}? This will create a Finance expense entry.`)) onProcess(existing.id); }} className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold flex items-center gap-1.5"><DollarSign size={14} /> Pay Now → Finance</button>
                )}
                {existing?.status === "paid" && (
                  <span className="text-xs text-emerald-600 font-semibold px-3 py-1.5 bg-emerald-50 rounded-xl">✓ Paid {existing.paidAt ? new Date(existing.paidAt).toLocaleDateString() : ""}</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
