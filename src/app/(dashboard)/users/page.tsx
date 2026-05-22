"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Plus, X, KeyRound, Trash2, UserCog, Search, CheckSquare, Square, ShieldAlert, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

type Role = "admin" | "cashier";

const roleStyle: Record<Role, string> = {
  admin:   "bg-brand-100 text-brand-700",
  cashier: "bg-surface-100 text-surface-600",
};

const AVAILABLE_PERMISSIONS = [
  { id: "PROCESS_SALES", label: "Process Sales", desc: "Access the POS terminal and process orders" },
  { id: "APPLY_DISCOUNTS", label: "Apply Discounts", desc: "Ability to apply manual discounts at checkout" },
  { id: "VOID_TRANSACTIONS", label: "Void Transactions", desc: "Ability to void or refund completed orders" },
  { id: "MANAGE_INVENTORY", label: "Manage Inventory", desc: "Add or edit products, categories, and stock" },
  { id: "MANAGE_CUSTOMERS", label: "Manage Customers", desc: "View and edit customer loyalty accounts" },
  { id: "MANAGE_SUPPLIERS", label: "Manage Suppliers", desc: "Manage supplier lists and purchase orders" },
  { id: "MANAGE_FINANCE", label: "Manage Finance", desc: "Access balance sheets, income, and expenses" },
  { id: "VIEW_REPORTS", label: "View Reports", desc: "Access dashboard analytics and financial reports" },
  { id: "MANAGE_SETTINGS", label: "Manage Settings", desc: "Modify store settings and receipt configurations" },
  { id: "MANAGE_USERS", label: "Manage Users", desc: "Add, edit, or disable staff members" },
];

export default function UsersPage() {
  const { t } = useLanguage();
  
  // Modal state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Other state
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();

  const filteredUsers = (users ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const create = trpc.users.create.useMutation({
    onSuccess: (u) => {
      toast.success(`${u.name} created!`);
      utils.users.list.invalidate();
      closeForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.users.update.useMutation({
    onSuccess: (u) => {
      toast.success(`${u.name} updated!`);
      utils.users.list.invalidate();
      closeForm();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = trpc.users.toggleActive.useMutation({
    onSuccess: (u) => { toast.success(`${u.name} ${u.isActive ? "enabled" : "disabled"}`); utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.users.resetPassword.useMutation({
    onSuccess: () => { toast.success("Password reset!"); setResetId(null); setNewPass(""); },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.users.delete.useMutation({
    onSuccess: () => { toast.success("User deleted"); utils.users.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditId(null);
    setName(""); setEmail(""); setPassword(""); setRole("cashier"); setPermissions([]); setIsActive(true);
    setShowForm(true);
  };

  const openEdit = (user: NonNullable<typeof users>[number]) => {
    setEditId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(""); // Leave empty unless they want to change it (handled via separate inline reset)
    setRole(user.role as Role);
    setPermissions((user.permissions as string[]) || []);
    setIsActive(user.isActive);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
  };

  const handleSave = () => {
    if (editId) {
      update.mutate({ id: editId, name, email, role, permissions });
      // If active state changed during edit
      const user = users?.find(u => u.id === editId);
      if (user && user.isActive !== isActive) {
        toggleActive.mutate({ id: editId, isActive });
      }
    } else {
      create.mutate({ name, email, password, role, permissions });
    }
  };

  const togglePermission = (id: string) => {
    setPermissions(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <UserCog size={22} className="text-brand-600" /> {t.users.title}
          </h1>
          <p className="text-sm text-surface-400 mt-1">{users?.length ?? 0} users</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t.users.addUser}
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="card p-5 mb-6 border-brand-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-500" />
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-surface-800 text-lg">{editId ? "Edit User" : t.users.newUser}</h2>
            <button onClick={closeForm} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>
          
          <div className="grid grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.users.fullName}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Silva" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.common.email}</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@store.com" />
            </div>
            
            {!editId && (
              <div>
                <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.users.passwordField}</label>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.users.role}</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="cashier">{t.users.cashier}</option>
                <option value="admin">{t.users.admin}</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-semibold text-surface-600 mb-2.5 uppercase tracking-wider">Granular Permissions</label>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_PERMISSIONS.map(p => {
                const isSelected = permissions.includes(p.id);
                // Admins typically have all permissions implicitly, but we can still show them checked or let them customize
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePermission(p.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${isSelected ? "bg-brand-50 border-brand-200" : "bg-white border-surface-200 hover:border-brand-200"}`}
                  >
                    <div className={`mt-0.5 ${isSelected ? "text-brand-600" : "text-surface-300"}`}>
                      {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${isSelected ? "text-brand-800" : "text-surface-700"}`}>{p.label}</p>
                      <p className="text-xs text-surface-400 mt-0.5 leading-snug">{p.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {editId && (
            <div className="mb-6 p-4 rounded-xl border border-red-100 bg-red-50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-red-800 flex items-center gap-2">
                  <ShieldAlert size={16} /> Account Status
                </p>
                <p className="text-xs text-red-600 mt-1">Disable an employee's account to immediately revoke access to the POS system.</p>
              </div>
              <button
                onClick={() => setIsActive(!isActive)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${isActive ? "bg-white border border-red-200 text-red-600 hover:bg-red-50 shadow-sm" : "bg-green-600 text-white hover:bg-green-700 shadow-sm"}`}
              >
                {isActive ? "Suspend Account" : "Re-activate Account"}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!name || !email || (!editId && !password) || create.isPending || update.isPending}
              className="btn-primary"
            >
              {create.isPending || update.isPending ? t.common.saving : editId ? "Save Changes" : t.users.createUser}
            </button>
            <button onClick={closeForm} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="card overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-surface-100">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-surface-300">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">{search ? "No users match your search" : "No users yet"}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.users.userHeader}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.users.role}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Permissions</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.common.status}</th>
                <th className="px-4 py-3 text-xs font-semibold text-surface-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredUsers.map((user) => {
                const perms = (user.permissions as string[]) || [];
                return (
                <tr key={user.id} className={`hover:bg-surface-50 ${!user.isActive ? "opacity-60 bg-surface-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${user.isActive ? "bg-brand-100" : "bg-surface-200"}`}>
                        <span className={`text-xs font-bold ${user.isActive ? "text-brand-700" : "text-surface-500"}`}>{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className={`font-medium ${user.isActive ? "text-surface-800" : "text-surface-500 line-through"}`}>{user.name}</p>
                        <p className="text-xs text-surface-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleStyle[user.role as Role]}`}>
                      {user.role === "admin" ? t.users.admin : t.users.cashier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {perms.length === 0 ? (
                        <span className="text-xs text-surface-400 italic">No specific permissions</span>
                      ) : (
                        perms.map(p => (
                          <span key={p} className="text-[10px] font-medium bg-surface-100 text-surface-600 px-1.5 py-0.5 rounded">
                            {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {user.isActive ? t.common.active : "Suspended"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Reset password inline */}
                      {resetId === user.id ? (
                        <div className="flex items-center gap-2 mr-2 bg-white border border-surface-200 p-1 rounded-lg shadow-sm">
                          <input
                            type="password" className="input py-1 text-xs w-28" placeholder="New pass"
                            value={newPass} onChange={(e) => setNewPass(e.target.value)}
                          />
                          <button
                            onClick={() => resetPassword.mutate({ id: user.id, newPassword: newPass })}
                            disabled={newPass.length < 6 || resetPassword.isPending}
                            className="text-xs bg-brand-600 text-white px-2.5 py-1.5 rounded disabled:opacity-50"
                          >Save</button>
                          <button onClick={() => { setResetId(null); setNewPass(""); }} className="text-xs text-surface-400 px-1 hover:text-surface-600">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResetId(user.id)}
                          title="Reset password"
                          className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        ><KeyRound size={16} /></button>
                      )}

                      <button
                        onClick={() => openEdit(user)}
                        title="Edit User & Permissions"
                        className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <UserCog size={16} />
                      </button>

                      <button
                        onClick={() => { if (confirm(`Permanently delete ${user.name}? This cannot be undone.`)) del.mutate({ id: user.id }); }}
                        title="Delete user"
                        className="p-1.5 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                      ><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

