"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, Trash2, X, Truck } from "lucide-react";
import toast from "react-hot-toast";

type SupplierForm = {
  name: string; contactName: string; phone: string;
  email: string; address: string; notes: string;
};
const emptyForm: SupplierForm = { name: "", contactName: "", phone: "", email: "", address: "", notes: "" };

export default function SuppliersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierForm>(emptyForm);

  const utils = trpc.useUtils();
  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();

  const create = trpc.suppliers.create.useMutation({
    onSuccess: () => { toast.success("Supplier added!"); utils.suppliers.list.invalidate(); setShowForm(false); setForm(emptyForm); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.suppliers.update.useMutation({
    onSuccess: () => { toast.success("Supplier updated!"); utils.suppliers.list.invalidate(); setShowForm(false); setEditId(null); setForm(emptyForm); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.suppliers.delete.useMutation({
    onSuccess: () => { toast.success("Supplier deleted"); utils.suppliers.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const f = (label: string, key: keyof SupplierForm, type = "text") => (
    <div>
      <label className="block text-xs font-medium text-surface-600 mb-1">{label}</label>
      <input type={type} className="input" value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  const openEdit = (s: NonNullable<typeof suppliers>[number]) => {
    setEditId(s.id);
    setForm({ name: s.name, contactName: s.contactName ?? "", phone: s.phone ?? "", email: s.email ?? "", address: s.address ?? "", notes: s.notes ?? "" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (editId) update.mutate({ id: editId, ...form });
    else create.mutate(form);
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <Truck size={22} className="text-brand-600" /> Suppliers
          </h1>
          <p className="text-sm text-surface-400 mt-1">{suppliers?.length ?? 0} suppliers registered</p>
        </div>
        <button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-800">{editId ? "Edit Supplier" : "New Supplier"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {f("Company Name *", "name")}
            {f("Contact Person", "contactName")}
            {f("Phone", "phone", "tel")}
            {f("Email", "email", "email")}
            <div className="col-span-2">{f("Address", "address")}</div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-surface-600 mb-1">Notes</label>
              <textarea className="input min-h-[80px] resize-none" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={!form.name || create.isPending || update.isPending} className="btn-primary">
              {create.isPending || update.isPending ? "Saving..." : editId ? "Update Supplier" : "Save Supplier"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">Loading...</div>
        ) : suppliers?.length === 0 ? (
          <div className="p-10 text-center text-surface-300">
            <Truck size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No suppliers yet. Add your first supplier.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Email / Phone</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {suppliers?.map((s) => (
                <tr key={s.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-surface-800">{s.name}</p>
                    {s.address && <p className="text-xs text-surface-400 truncate max-w-xs">{s.address}</p>}
                  </td>
                  <td className="px-4 py-3 text-surface-600">{s.contactName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p className="text-surface-600 text-xs">{s.email ?? ""}</p>
                    <p className="text-surface-400 text-xs">{s.phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(s)} className="text-surface-400 hover:text-brand-600 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm(`Delete supplier "${s.name}"?`)) del.mutate({ id: s.id }); }}
                        className="text-surface-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
