"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Plus, X, KeyRound, ShieldCheck, ShieldOff, Trash2, UserCog, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

type Role = "admin" | "cashier";

const roleStyle: Record<Role, string> = {
  admin:   "bg-brand-100 text-brand-700",
  cashier: "bg-surface-100 text-surface-600",
};

export default function UsersPage() {
  const { t } = useLanguage();
  const [showCreate, setShowCreate] = useState(false);
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [role,       setRole]       = useState<Role>("cashier");
  const [resetId,    setResetId]    = useState<string | null>(null);
  const [newPass,    setNewPass]    = useState("");
  const [search,     setSearch]     = useState("");

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
      setShowCreate(false);
      setName(""); setEmail(""); setPassword(""); setRole("cashier");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: (u) => { toast.success(`${u.name} is now ${u.role}`); utils.users.list.invalidate(); },
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <UserCog size={22} className="text-brand-600" /> {t.users.title}
          </h1>
          <p className="text-sm text-surface-400 mt-1">{users?.length ?? 0} users</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> {t.users.addUser}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-surface-800">{t.users.newUser}</h2>
            <button onClick={() => setShowCreate(false)} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">{t.users.fullName}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Silva" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">{t.common.email}</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@store.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">{t.users.passwordField}</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">{t.users.role}</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="cashier">{t.users.cashier}</option>
                <option value="admin">{t.users.admin}</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => create.mutate({ name, email, password, role })}
              disabled={!name || !email || !password || create.isPending}
              className="btn-primary"
            >
              {create.isPending ? t.common.saving : t.users.createUser}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
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
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.common.status}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.users.created}</th>
                <th className="px-4 py-3 text-xs font-semibold text-surface-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-brand-700">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-surface-800">{user.name}</p>
                        <p className="text-xs text-surface-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleStyle[user.role as Role]}`}>
                      {user.role === "admin" ? t.users.admin : t.users.cashier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {user.isActive ? t.common.active : t.users.disabled}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Reset password inline */}
                      {resetId === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="password" className="input py-1 text-xs w-32" placeholder="New password"
                            value={newPass} onChange={(e) => setNewPass(e.target.value)}
                          />
                          <button
                            onClick={() => resetPassword.mutate({ id: user.id, newPassword: newPass })}
                            disabled={newPass.length < 6 || resetPassword.isPending}
                            className="text-xs bg-brand-600 text-white px-2 py-1 rounded-lg"
                          >Save</button>
                          <button onClick={() => { setResetId(null); setNewPass(""); }} className="text-xs text-surface-400">✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResetId(user.id)}
                          title="Reset password"
                          className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        ><KeyRound size={14} /></button>
                      )}

                      <button
                        onClick={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}
                        title={user.isActive ? "Disable user" : "Enable user"}
                        className={`p-1.5 rounded-lg transition-colors ${user.isActive ? "text-surface-400 hover:text-amber-600 hover:bg-amber-50" : "text-surface-400 hover:text-green-600 hover:bg-green-50"}`}
                      >
                        {user.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                      </button>

                      <button
                        onClick={() => { if (confirm(`Delete ${user.name}?`)) del.mutate({ id: user.id }); }}
                        title="Delete user"
                        className="p-1.5 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      ><Trash2 size={14} /></button>
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
