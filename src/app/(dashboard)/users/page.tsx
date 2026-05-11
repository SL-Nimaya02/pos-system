"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Users, Plus, X, KeyRound, ShieldCheck, ShieldOff, Trash2, UserCog } from "lucide-react";
import toast from "react-hot-toast";

type Role = "admin" | "cashier";

const roleStyle: Record<Role, string> = {
  admin:   "bg-brand-100 text-brand-700",
  cashier: "bg-surface-100 text-surface-600",
};

export default function UsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [role,       setRole]       = useState<Role>("cashier");
  const [resetId,    setResetId]    = useState<string | null>(null);
  const [newPass,    setNewPass]    = useState("");

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.users.list.useQuery();

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
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <UserCog size={22} className="text-brand-600" /> User Management
          </h1>
          <p className="text-sm text-surface-400 mt-1">{users?.length ?? 0} users</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add User
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-surface-800">New User</h2>
            <button onClick={() => setShowCreate(false)} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Full Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Silva" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@store.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Password</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => create.mutate({ name, email, password, role })}
              disabled={!name || !email || !password || create.isPending}
              className="btn-primary"
            >
              {create.isPending ? "Creating..." : "Create User"}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-surface-400 text-sm">Loading...</div>
        ) : users?.length === 0 ? (
          <div className="p-10 text-center text-surface-300">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No users yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">User</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Role</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Created</th>
                <th className="px-4 py-3 text-xs font-semibold text-surface-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {users?.map((user) => (
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
                    <select
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${roleStyle[user.role as Role]}`}
                      value={user.role}
                      onChange={(e) => updateRole.mutate({ id: user.id, role: e.target.value as Role })}
                    >
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {user.isActive ? "Active" : "Disabled"}
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
