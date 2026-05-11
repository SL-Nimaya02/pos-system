import { Box, AlertCircle } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Box size={24} className="text-brand-600" />
          Inventory
        </h1>
        <p className="text-sm text-surface-400 mt-1">Monitor and manage your stock levels</p>
      </div>

      <div className="card p-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
          <AlertCircle size={28} className="text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-surface-800">Inventory Management</h2>
        <p className="text-sm text-surface-400 max-w-sm">
          This section will allow you to view stock levels, set low-stock alerts, and adjust inventory counts.
          Coming soon.
        </p>
        <p className="text-xs text-surface-300 mt-2">
          For now, manage stock quantities from the <strong className="text-brand-600">Products</strong> page.
        </p>
      </div>
    </div>
  );
}
