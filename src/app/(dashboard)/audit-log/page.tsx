"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ClipboardList, ChevronDown, ChevronRight,
  Download, Search, RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

const ENTITY_TYPES = ["order", "product", "user", "session", "finance", "setting"];

const ACTION_BADGE: Record<string, string> = {
  ORDER_CREATED:     "bg-emerald-100 text-emerald-700",
  REFUND_PROCESSED:  "bg-red-100    text-red-700",
  PRODUCT_CREATED:   "bg-blue-100   text-blue-700",
  PRODUCT_UPDATED:   "bg-amber-100  text-amber-700",
  PRODUCT_DELETED:   "bg-red-100    text-red-700",
  STOCK_ADJUSTED:    "bg-purple-100 text-purple-700",
  USER_CREATED:      "bg-blue-100   text-blue-700",
  USER_ROLE_CHANGED: "bg-amber-100  text-amber-700",
  USER_DEACTIVATED:  "bg-red-100    text-red-700",
  USER_ACTIVATED:    "bg-emerald-100 text-emerald-700",
  SESSION_OPENED:    "bg-indigo-100 text-indigo-700",
  SESSION_CLOSED:    "bg-indigo-100 text-indigo-700",
  CASH_MOVEMENT:     "bg-yellow-100 text-yellow-700",
  EXPENSE_ADDED:     "bg-orange-100 text-orange-700",
  SETTING_CHANGED:   "bg-surface-100 text-surface-600",
};

function badgeClass(action: string) {
  return ACTION_BADGE[action] ?? "bg-surface-100 text-surface-600";
}

type KVPair = { key: string; before: unknown; after: unknown };

function buildDiff(
  before: unknown,
  after: unknown,
  metadata: unknown
): KVPair[] {
  const result: KVPair[] = [];
  const sources = [before, after, metadata].filter(Boolean);
  const allKeys = new Set<string>();
  for (const src of sources) {
    if (src && typeof src === "object") {
      Object.keys(src as object).forEach((k) => allKeys.add(k));
    }
  }
  for (const key of allKeys) {
    const bVal = before && typeof before === "object" ? (before as Record<string, unknown>)[key] : undefined;
    const aVal = after  && typeof after  === "object" ? (after  as Record<string, unknown>)[key] : undefined;
    const mVal = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>)[key] : undefined;
    result.push({ key, before: bVal, after: aVal ?? mVal });
  }
  return result;
}

function renderValue(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function AuditLogPage() {
  const [actionFilter, setActionFilter]     = useState("");
  const [entityFilter, setEntityFilter]     = useState("");
  const [userFilter, setUserFilter]         = useState("");
  const [startDate, setStartDate]           = useState("");
  const [endDate, setEndDate]               = useState("");
  const [page, setPage]                     = useState(0);
  const [expandedId, setExpandedId]         = useState<string | null>(null);

  const resetPage = () => setPage(0);

  const { data, isLoading, refetch } = trpc.auditLog.list.useQuery({
    limit:      PAGE_SIZE,
    offset:     page * PAGE_SIZE,
    action:     actionFilter || undefined,
    entityType: entityFilter || undefined,
    userId:     userFilter   || undefined,
    startDate:  startDate    || undefined,
    endDate:    endDate      || undefined,
  });

  const { data: distinctActions } = trpc.auditLog.distinctActions.useQuery();
  const { data: users }           = trpc.users.list.useQuery();

  const logs      = data?.logs  ?? [];
  const total     = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleExport = () => {
    const header = ["Timestamp", "User", "Action", "Entity Type", "Entity ID", "IP Address", "After / Details"];
    const rows = logs.map((l) => [
      new Date(l.timestamp).toLocaleString(),
      l.userName ?? l.userId ?? "System",
      l.action,
      l.entityType ?? "",
      l.entityId   ?? "",
      l.ipAddress  ?? "",
      JSON.stringify(l.afterValue ?? l.metadata ?? {}),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([header, ...rows]),
      "Audit Log"
    );
    XLSX.writeFile(wb, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`, { bookType: "csv" });
  };

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <ClipboardList size={24} className="text-brand-600" /> Audit Log
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            {isLoading ? "Loading…" : `${total.toLocaleString()} total records`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); resetPage(); }}
            className="input pl-8 text-sm"
          >
            <option value="">All Actions</option>
            {(distinctActions ?? []).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); resetPage(); }}
          className="input text-sm"
        >
          <option value="">All Entity Types</option>
          {ENTITY_TYPES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <select
          value={userFilter}
          onChange={(e) => { setUserFilter(e.target.value); resetPage(); }}
          className="input text-sm"
        >
          <option value="">All Users</option>
          {(users ?? []).map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); resetPage(); }}
          className="input text-sm"
          placeholder="From date"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); resetPage(); }}
          className="input text-sm"
          placeholder="To date"
        />
      </div>

      {/* ── Table ── */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-100 text-left">
              <th className="px-4 py-3 font-semibold text-surface-500 w-6"></th>
              <th className="px-4 py-3 font-semibold text-surface-500">Timestamp</th>
              <th className="px-4 py-3 font-semibold text-surface-500">User</th>
              <th className="px-4 py-3 font-semibold text-surface-500">Action</th>
              <th className="px-4 py-3 font-semibold text-surface-500">Entity</th>
              <th className="px-4 py-3 font-semibold text-surface-500">Entity ID</th>
              <th className="px-4 py-3 font-semibold text-surface-500">IP</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-surface-400">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-surface-400">
                  No audit log entries found
                </td>
              </tr>
            )}
            {logs.map((log) => {
              const expanded = expandedId === log.id;
              const diff = buildDiff(log.beforeValue, log.afterValue, log.metadata);
              return (
                <>
                  <tr
                    key={log.id}
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="border-b border-surface-50 hover:bg-surface-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-surface-400">
                      {expanded
                        ? <ChevronDown size={14} />
                        : <ChevronRight size={14} />
                      }
                    </td>
                    <td className="px-4 py-3 text-surface-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-surface-700 font-medium">
                      {log.userName ?? log.userId ?? <span className="text-surface-400 italic">System</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badgeClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-surface-500 capitalize">{log.entityType ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-surface-400 truncate max-w-[120px]">
                      {log.entityId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-surface-400 font-mono text-xs">{log.ipAddress ?? "—"}</td>
                  </tr>

                  {expanded && (
                    <tr key={`${log.id}-detail`} className="bg-surface-50">
                      <td colSpan={7} className="px-8 py-4">
                        {diff.length === 0 ? (
                          <p className="text-sm text-surface-400 italic">No details recorded</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {diff.map(({ key, before, after }) => {
                              const changed = before !== undefined && after !== undefined && renderValue(before) !== renderValue(after);
                              const isNew   = before === undefined && after !== undefined;
                              const rowCls  = changed ? "bg-amber-50 border-amber-200"
                                           : isNew   ? "bg-emerald-50 border-emerald-200"
                                           :           "bg-white border-surface-100";
                              return (
                                <div key={key} className={`rounded-lg border px-3 py-2 text-xs ${rowCls}`}>
                                  <p className="font-semibold text-surface-500 mb-0.5">{key}</p>
                                  {before !== undefined && (
                                    <p className="text-red-600 line-through">{renderValue(before)}</p>
                                  )}
                                  {after !== undefined && (
                                    <p className={changed ? "text-emerald-700 font-medium" : "text-surface-700"}>
                                      {renderValue(after)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-surface-500">
          <span>
            Page {page + 1} of {totalPages} · {total} records
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-secondary disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
