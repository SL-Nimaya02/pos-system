import { Users } from "lucide-react";

export default function CustomersPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Users size={24} className="text-brand-600" />
          Customers
        </h1>
        <p className="text-sm text-surface-400 mt-1">Manage your customer base and purchase history</p>
      </div>

      <div className="card p-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
          <Users size={28} className="text-brand-500" />
        </div>
        <h2 className="text-lg font-semibold text-surface-800">Customer Management</h2>
        <p className="text-sm text-surface-400 max-w-sm">
          Track customer profiles, purchase history, loyalty points, and contact details.
          This module is under development.
        </p>
        <span className="text-xs bg-surface-100 text-surface-500 px-3 py-1 rounded-full font-medium">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
