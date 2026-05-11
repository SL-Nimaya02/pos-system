import { FileText } from "lucide-react";

export default function GRNPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <FileText size={24} className="text-brand-600" />
          GRN — Goods Received Notes
        </h1>
        <p className="text-sm text-surface-400 mt-1">Record incoming stock from suppliers</p>
      </div>

      <div className="card p-8 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
          <FileText size={28} className="text-brand-500" />
        </div>
        <h2 className="text-lg font-semibold text-surface-800">Stock-In Module</h2>
        <p className="text-sm text-surface-400 max-w-sm">
          Create and manage Goods Received Notes to track incoming stock. 
          This module will link directly to your suppliers and automatically update inventory.
        </p>
        <span className="text-xs bg-surface-100 text-surface-500 px-3 py-1 rounded-full font-medium">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
