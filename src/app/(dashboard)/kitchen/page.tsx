"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ChefHat, Plus, Trash2, Edit2, Check, X, Package,
  AlertTriangle, TrendingDown, TrendingUp, ClipboardList,
  Calendar, ChevronDown, ChevronUp, FlaskConical, Boxes,
} from "lucide-react";
import toast from "react-hot-toast";

const fmt3 = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const todayStr = () => new Date().toISOString().slice(0, 10);
const addDays  = (d: string, n: number) => {
  const dt = new Date(d); dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
};

const UNITS = ["g", "kg", "ml", "l", "pcs", "cups", "tbsp", "tsp", "slices", "portions"];
const ADJ_TYPES = [
  { value: "received",      label: "Received / Restocked", sign: "+" },
  { value: "opening_count", label: "Opening Stock Count",  sign: "+" },
  { value: "manual_count",  label: "Manual Correction",    sign: "±" },
  { value: "waste",         label: "Waste / Spoilage",     sign: "−" },
  { value: "other",         label: "Other Deduction",      sign: "−" },
] as const;

type AdjType = typeof ADJ_TYPES[number]["value"];

// ─── Ingredient Form ──────────────────────────────────────────────────────────
function IngredientForm({
  initial, onSave, onCancel,
}: {
  initial?: { id: string; name: string; unit: string; currentStock: string; minStock: string | null; costPerUnit: string | null; notes: string | null };
  onSave: (v: { name: string; unit: string; currentStock: string; minStock: string; costPerUnit: string; notes: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName]         = useState(initial?.name ?? "");
  const [unit, setUnit]         = useState(initial?.unit ?? "g");
  const [stock, setStock]       = useState(initial?.currentStock ?? "0");
  const [minStock, setMinStock] = useState(initial?.minStock ?? "0");
  const [cost, setCost]         = useState(initial?.costPerUnit ?? "0");
  const [notes, setNotes]       = useState(initial?.notes ?? "");

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-surface-50 rounded-xl border border-surface-200">
      <div className="col-span-2 md:col-span-1">
        <label className="block text-xs font-semibold text-surface-500 mb-1">Name *</label>
        <input className="input text-sm py-1.5" placeholder="e.g. Chicken Breast" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Unit *</label>
        <select className="input text-sm py-1.5" value={unit} onChange={e => setUnit(e.target.value)}>
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Current Stock</label>
        <input type="number" min="0" step="0.001" className="input text-sm py-1.5" value={stock} onChange={e => setStock(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Min Stock Alert</label>
        <input type="number" min="0" step="0.001" className="input text-sm py-1.5" value={minStock} onChange={e => setMinStock(e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-surface-500 mb-1">Cost per unit (LKR)</label>
        <input type="number" min="0" step="0.01" className="input text-sm py-1.5" value={cost} onChange={e => setCost(e.target.value)} />
      </div>
      <div className="col-span-2 md:col-span-3">
        <label className="block text-xs font-semibold text-surface-500 mb-1">Notes</label>
        <input className="input text-sm py-1.5" placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary px-4 py-1.5 text-sm flex items-center gap-1.5"><X size={14} /> Cancel</button>
        <button onClick={() => { if (!name.trim()) return toast.error("Name required"); onSave({ name, unit, currentStock: stock, minStock, costPerUnit: cost, notes }); }} className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"><Check size={14} /> Save</button>
      </div>
    </div>
  );
}

// ─── Recipe Form ──────────────────────────────────────────────────────────────
function RecipeForm({
  initial, products, ingredients, onSave, onCancel,
}: {
  initial?: any;
  products: { id: string; name: string }[];
  ingredients: { id: string; name: string; unit: string }[];
  onSave: (v: any) => void;
  onCancel: () => void;
}) {
  const [name, setName]           = useState(initial?.name ?? "");
  const [productId, setProductId] = useState(initial?.productId ?? "");
  const [yieldCount, setYield]    = useState(String(initial?.portionYield ?? 1));
  const [notes, setNotes]         = useState(initial?.notes ?? "");
  const [lines, setLines]         = useState<{ ingredientId: string; quantity: string }[]>(
    initial?.ingredients?.map((ri: any) => ({ ingredientId: ri.ingredientId, quantity: ri.quantity })) ?? [{ ingredientId: "", quantity: "" }]
  );

  const updateLine = (i: number, k: "ingredientId" | "quantity", v: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  const addLine    = () => setLines(prev => [...prev, { ingredientId: "", quantity: "" }]);
  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) return toast.error("Recipe name required");
    const filled = lines.filter(l => l.ingredientId && l.quantity);
    if (filled.length === 0) return toast.error("Add at least one ingredient");
    onSave({ id: initial?.id, name, productId: productId || undefined, portionYield: parseInt(yieldCount) || 1, notes, ingredients: filled });
  };

  return (
    <div className="space-y-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-surface-500 mb-1">Recipe Name *</label>
          <input className="input text-sm py-1.5" placeholder="e.g. Chicken Curry" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-500 mb-1">Linked Product (POS item)</label>
          <select className="input text-sm py-1.5" value={productId} onChange={e => setProductId(e.target.value)}>
            <option value="">— None —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-surface-500 mb-1">Portions this recipe makes</label>
          <input type="number" min="1" className="input text-sm py-1.5" value={yieldCount} onChange={e => setYield(e.target.value)} />
        </div>
        <div className="col-span-2 md:col-span-4">
          <label className="block text-xs font-semibold text-surface-500 mb-1">Notes</label>
          <input className="input text-sm py-1.5" placeholder="Optional recipe notes…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-surface-600 uppercase tracking-wider mb-2">Ingredients (per portion)</p>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-2 items-center">
              <select className="input text-sm py-1.5" value={line.ingredientId} onChange={e => updateLine(i, "ingredientId", e.target.value)}>
                <option value="">Select ingredient…</option>
                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}
              </select>
              <div className="flex items-center gap-1">
                <input type="number" min="0" step="0.001" className="input text-sm py-1.5 text-right" placeholder="qty" value={line.quantity} onChange={e => updateLine(i, "quantity", e.target.value)} />
                <span className="text-xs text-surface-400 shrink-0">{ingredients.find(ing => ing.id === line.ingredientId)?.unit ?? "—"}</span>
              </div>
              <button onClick={() => removeLine(i)} className="p-1 text-surface-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button onClick={addLine} className="mt-2 text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"><Plus size={13} /> Add ingredient</button>
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary px-4 py-1.5 text-sm flex items-center gap-1.5"><X size={14} /> Cancel</button>
        <button onClick={handleSave} className="btn-primary px-4 py-1.5 text-sm flex items-center gap-1.5"><Check size={14} /> Save Recipe</button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KitchenPage() {
  const [tab, setTab] = useState<"ingredients" | "recipes" | "report" | "adjustments">("ingredients");

  // Date range for report
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate,   setEndDate]   = useState(todayStr());

  // UI state
  const [showIngForm, setShowIngForm]     = useState(false);
  const [editIngId,   setEditIngId]       = useState<string | null>(null);
  const [showRecForm, setShowRecForm]     = useState(false);
  const [editRecId,   setEditRecId]       = useState<string | null>(null);
  const [expandedRec, setExpandedRec]     = useState<string | null>(null);

  // Adjustment form
  const [adjIngId,    setAdjIngId]    = useState("");
  const [adjType,     setAdjType]     = useState<AdjType>("received");
  const [adjQty,      setAdjQty]      = useState("");
  const [adjDate,     setAdjDate]     = useState(todayStr());
  const [adjReason,   setAdjReason]   = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: ingredients = [] } = trpc.kitchen.listIngredients.useQuery();
  const { data: recipes = [] }     = trpc.kitchen.listRecipes.useQuery();
  const { data: products = [] }    = trpc.products.list.useQuery({ activeOnly: true });
  const { data: adjustments = [] } = trpc.kitchen.listAdjustments.useQuery(
    { startDate, endDate },
    { enabled: tab === "adjustments" }
  );
  const { data: report = [], isLoading: reportLoading } = trpc.kitchen.usageReport.useQuery(
    { startDate, endDate },
    { enabled: tab === "report" }
  );

  // Mutations
  const createIng   = trpc.kitchen.createIngredient.useMutation({ onSuccess: () => { utils.kitchen.listIngredients.invalidate(); setShowIngForm(false); toast.success("Ingredient added"); } });
  const updateIng   = trpc.kitchen.updateIngredient.useMutation({ onSuccess: () => { utils.kitchen.listIngredients.invalidate(); setEditIngId(null); toast.success("Ingredient updated"); } });
  const deleteIng   = trpc.kitchen.deleteIngredient.useMutation({ onSuccess: () => { utils.kitchen.listIngredients.invalidate(); toast.success("Ingredient removed"); } });
  const upsertRec   = trpc.kitchen.upsertRecipe.useMutation({ onSuccess: () => { utils.kitchen.listRecipes.invalidate(); setShowRecForm(false); setEditRecId(null); toast.success("Recipe saved"); } });
  const deleteRec   = trpc.kitchen.deleteRecipe.useMutation({ onSuccess: () => { utils.kitchen.listRecipes.invalidate(); toast.success("Recipe deleted"); } });
  const createAdj   = trpc.kitchen.createAdjustment.useMutation({
    onSuccess: () => {
      utils.kitchen.listIngredients.invalidate();
      utils.kitchen.listAdjustments.invalidate();
      utils.kitchen.usageReport.invalidate();
      setAdjIngId(""); setAdjQty(""); setAdjReason("");
      toast.success("Adjustment recorded");
    },
  });

  const editIngData = editIngId ? ingredients.find(i => i.id === editIngId) : null;
  const editRecData = editRecId ? recipes.find(r => r.id === editRecId) : null;

  const lowStock = ingredients.filter(i => parseFloat(i.minStock ?? "0") > 0 && parseFloat(i.currentStock) <= parseFloat(i.minStock ?? "0"));

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
            <ChefHat size={24} className="text-brand-600" /> Kitchen Stock Management
          </h1>
          <p className="text-sm text-surface-400 mt-1">Manage ingredients, recipes, and track usage vs stock levels</p>
        </div>

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-700">
              {lowStock.length} ingredient{lowStock.length !== 1 ? "s" : ""} low on stock
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl w-fit">
        {([
          { key: "ingredients", label: "Ingredients",  icon: Boxes },
          { key: "recipes",     label: "Recipes",      icon: FlaskConical },
          { key: "report",      label: "Usage Report", icon: ClipboardList },
          { key: "adjustments", label: "Adjustments",  icon: Package },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === key ? "bg-white shadow text-brand-700" : "text-surface-500 hover:text-surface-700"}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── INGREDIENTS TAB ── */}
      {tab === "ingredients" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">{ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}</p>
            {!showIngForm && (
              <button onClick={() => { setShowIngForm(true); setEditIngId(null); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                <Plus size={15} /> Add Ingredient
              </button>
            )}
          </div>

          {showIngForm && (
            <IngredientForm
              onSave={(v) => createIng.mutate(v)}
              onCancel={() => setShowIngForm(false)}
            />
          )}

          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 border-b border-surface-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Ingredient</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Current Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Min Alert</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Cost / unit</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Status</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {ingredients.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-surface-300 text-sm">No ingredients yet. Add your first ingredient above.</td></tr>
                )}
                {ingredients.map(ing => {
                  const stock   = parseFloat(ing.currentStock);
                  const minStk  = parseFloat(ing.minStock ?? "0");
                  const isLow   = minStk > 0 && stock <= minStk;
                  const isOut   = stock <= 0;
                  const isEdit  = editIngId === ing.id;
                  return (
                    <>
                      <tr key={ing.id} className="border-b border-surface-100 hover:bg-surface-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-surface-800">{ing.name}</p>
                          {ing.notes && <p className="text-xs text-surface-400">{ing.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-surface-900">
                          {fmt3(stock)} <span className="text-xs text-surface-400 font-normal">{ing.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-surface-500 text-xs">
                          {minStk > 0 ? `${fmt3(minStk)} ${ing.unit}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-surface-500 text-xs">
                          {parseFloat(ing.costPerUnit ?? "0") > 0 ? `LKR ${parseFloat(ing.costPerUnit ?? "0").toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOut
                            ? <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Out</span>
                            : isLow
                              ? <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Low</span>
                              : <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">OK</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditIngId(isEdit ? null : ing.id)} className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                            <button onClick={() => { if (confirm(`Delete ${ing.name}?`)) deleteIng.mutate({ id: ing.id }); }} className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                      {isEdit && editIngData && (
                        <tr key={`${ing.id}-edit`}>
                          <td colSpan={6} className="px-4 pb-4 pt-1 bg-surface-50/60">
                            <IngredientForm
                              initial={editIngData as any}
                              onSave={(v) => updateIng.mutate({ id: ing.id, ...v })}
                              onCancel={() => setEditIngId(null)}
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

      {/* ── RECIPES TAB ── */}
      {tab === "recipes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">{recipes.length} recipe{recipes.length !== 1 ? "s" : ""}</p>
            {!showRecForm && (
              <button onClick={() => { setShowRecForm(true); setEditRecId(null); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                <Plus size={15} /> New Recipe
              </button>
            )}
          </div>

          {showRecForm && (
            <RecipeForm
              products={products as any}
              ingredients={ingredients}
              onSave={(v) => upsertRec.mutate(v)}
              onCancel={() => setShowRecForm(false)}
            />
          )}

          <div className="space-y-3">
            {recipes.length === 0 && !showRecForm && (
              <div className="card p-10 text-center text-surface-300">
                <FlaskConical size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No recipes yet.</p>
                <p className="text-xs mt-1">Create a recipe and link it to a POS product to track ingredient usage.</p>
              </div>
            )}
            {recipes.map(rec => {
              const isExpanded = expandedRec === rec.id;
              const isEdit     = editRecId === rec.id;
              return (
                <div key={rec.id} className="card overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors"
                    onClick={() => setExpandedRec(isExpanded ? null : rec.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                        <FlaskConical size={16} className="text-brand-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-surface-800">{rec.name}</p>
                        <p className="text-xs text-surface-400">
                          {rec.product ? `→ ${rec.product.name}` : "Not linked to a product"} ·{" "}
                          {rec.portionYield} portion{rec.portionYield !== 1 ? "s" : ""} · {rec.ingredients.length} ingredient{rec.ingredients.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditRecId(rec.id); setShowRecForm(false); }}
                        className="p-1.5 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      ><Edit2 size={13} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm(`Delete recipe "${rec.name}"?`)) deleteRec.mutate({ id: rec.id }); }}
                        className="p-1.5 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      ><Trash2 size={13} /></button>
                      {isExpanded ? <ChevronUp size={16} className="text-surface-400" /> : <ChevronDown size={16} className="text-surface-400" />}
                    </div>
                  </div>

                  {isEdit && editRecData && (
                    <div className="border-t border-surface-100 px-4 py-4 bg-surface-50">
                      <RecipeForm
                        initial={{ ...editRecData, ingredients: editRecData.ingredients }}
                        products={products as any}
                        ingredients={ingredients}
                        onSave={(v) => upsertRec.mutate(v)}
                        onCancel={() => setEditRecId(null)}
                      />
                    </div>
                  )}

                  {isExpanded && !isEdit && (
                    <div className="border-t border-surface-100 px-4 py-3 bg-surface-50/60">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-100">
                            <th className="text-left pb-2 font-semibold text-surface-500">Ingredient</th>
                            <th className="text-right pb-2 font-semibold text-surface-500">Per Portion</th>
                            <th className="text-right pb-2 font-semibold text-surface-500">Current Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rec.ingredients.map(ri => {
                            const ing = ingredients.find(i => i.id === ri.ingredientId);
                            return (
                              <tr key={ri.id} className="border-b border-surface-50 last:border-0">
                                <td className="py-2 font-medium text-surface-700">{ri.ingredient?.name ?? "—"}</td>
                                <td className="py-2 text-right text-surface-600">{fmt3(parseFloat(ri.quantity))} {ri.ingredient?.unit}</td>
                                <td className="py-2 text-right text-surface-500">{ing ? `${fmt3(parseFloat(ing.currentStock))} ${ing.unit}` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {rec.notes && <p className="mt-2 text-xs text-surface-400 italic">{rec.notes}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── USAGE REPORT TAB ── */}
      {tab === "report" && (
        <div className="space-y-4">
          {/* Date selector */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1.5">
              {[
                { label: "Today",      start: todayStr(), end: todayStr() },
                { label: "Yesterday",  start: addDays(todayStr(), -1), end: addDays(todayStr(), -1) },
                { label: "Last 7 days",start: addDays(todayStr(), -6), end: todayStr() },
                { label: "This month", start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10), end: todayStr() },
              ].map(p => (
                <button key={p.label} onClick={() => { setStartDate(p.start); setEndDate(p.end); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${startDate === p.start && endDate === p.end ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Calendar size={14} className="text-surface-400" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input text-sm py-1.5 w-36" />
              <span className="text-surface-400 text-xs">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input text-sm py-1.5 w-36" />
            </div>
          </div>

          {/* Report table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-surface-50 border-b border-surface-200 flex items-center justify-between">
              <h2 className="font-semibold text-surface-700 text-xs uppercase tracking-wider">Ingredient Usage Report</h2>
              <span className="text-xs text-surface-400">{startDate} — {endDate}</span>
            </div>

            {reportLoading ? (
              <div className="p-10 text-center text-surface-400 text-sm">Calculating…</div>
            ) : report.length === 0 ? (
              <div className="p-10 text-center text-surface-300">
                <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No data for this period</p>
                <p className="text-xs mt-1">Make sure recipes are linked to products and orders exist in this range.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Ingredient</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Theoretical Usage</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Received</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Waste / Adj</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Current Stock</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map(row => {
                    const isOver  = row.variance > 0.01;   // used more than expected
                    const isUnder = row.variance < -0.01;  // used less than expected
                    const isLow   = row.currentStock <= row.minStock && row.minStock > 0;
                    return (
                      <tr key={row.ingredientId} className="border-b border-surface-100 hover:bg-surface-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-surface-800">{row.name}</p>
                          {isLow && <span className="text-xs text-amber-600 font-semibold">⚠ Low stock</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-surface-700 font-medium">
                          {fmt3(row.theoreticalUsage)} <span className="text-xs text-surface-400">{row.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                          {row.received > 0 ? `+${fmt3(row.received)} ${row.unit}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-red-500 text-sm">
                          {row.waste > 0 ? `${fmt3(row.waste)} ${row.unit}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-surface-900">
                          {fmt3(row.currentStock)} <span className="text-xs text-surface-400 font-normal">{row.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {Math.abs(row.variance) < 0.01 ? (
                            <span className="text-xs font-semibold text-emerald-600">✓ On track</span>
                          ) : isOver ? (
                            <div className="flex items-center justify-end gap-1 text-red-600">
                              <TrendingUp size={13} />
                              <span className="text-xs font-bold">+{fmt3(row.variance)} {row.unit}</span>
                              <span className="text-xs text-surface-400">(over-used)</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1 text-amber-600">
                              <TrendingDown size={13} />
                              <span className="text-xs font-bold">{fmt3(row.variance)} {row.unit}</span>
                              <span className="text-xs text-surface-400">(under-used)</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="text-xs text-surface-400 bg-surface-50 rounded-xl px-4 py-3 border border-surface-100">
            <strong>How variance is calculated:</strong> Theoretical usage = units sold × recipe ingredient qty. A positive variance (over-used) means more ingredient was consumed than expected — possible waste, spillage, or theft. A negative variance (under-used) may indicate over-portioning hasn't happened, or stock figures need updating.
          </div>
        </div>
      )}

      {/* ── ADJUSTMENTS TAB ── */}
      {tab === "adjustments" && (
        <div className="space-y-5">
          {/* Log new adjustment */}
          <div className="card p-5 space-y-4 border-l-4 border-l-brand-500">
            <h2 className="font-semibold text-surface-700 text-xs uppercase tracking-wider">Log Stock Adjustment</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Ingredient *</label>
                <select className="input text-sm py-1.5" value={adjIngId} onChange={e => setAdjIngId(e.target.value)}>
                  <option value="">Select…</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Type *</label>
                <select className="input text-sm py-1.5" value={adjType} onChange={e => setAdjType(e.target.value as AdjType)}>
                  {ADJ_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">
                  Quantity {adjIngId ? `(${ingredients.find(i => i.id === adjIngId)?.unit ?? ""})` : ""} *
                </label>
                <input type="number" min="0" step="0.001" className="input text-sm py-1.5" placeholder="0.000" value={adjQty} onChange={e => setAdjQty(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-500 mb-1">Date *</label>
                <input type="date" className="input text-sm py-1.5" value={adjDate} onChange={e => setAdjDate(e.target.value)} />
              </div>
              <div className="col-span-2 md:col-span-4">
                <label className="block text-xs font-semibold text-surface-500 mb-1">Reason / Notes</label>
                <input className="input text-sm py-1.5" placeholder="e.g. Weekly delivery from ABC Farms, spoilage due to power cut…" value={adjReason} onChange={e => setAdjReason(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (!adjIngId) return toast.error("Select an ingredient");
                  if (!adjQty || parseFloat(adjQty) <= 0) return toast.error("Enter a positive quantity");
                  createAdj.mutate({ ingredientId: adjIngId, date: adjDate, type: adjType, quantity: adjQty, reason: adjReason || undefined });
                }}
                disabled={createAdj.isPending}
                className="btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50"
              >
                <Plus size={15} /> {createAdj.isPending ? "Saving…" : "Record Adjustment"}
              </button>
            </div>
          </div>

          {/* Date filter for history */}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-surface-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input text-sm py-1.5 w-36" />
            <span className="text-surface-400 text-xs">to</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input text-sm py-1.5 w-36" />
          </div>

          {/* History */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 bg-surface-50 border-b border-surface-200">
              <h2 className="font-semibold text-surface-700 text-xs uppercase tracking-wider">Adjustment History</h2>
            </div>
            {adjustments.length === 0 ? (
              <div className="p-10 text-center text-surface-300 text-sm">No adjustments recorded for this period</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Ingredient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Quantity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Reason</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">By</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map(adj => {
                    const q    = parseFloat(adj.quantity);
                    const isPos = q >= 0;
                    const typeInfo = ADJ_TYPES.find(a => a.value === adj.type);
                    return (
                      <tr key={adj.id} className="border-b border-surface-100 hover:bg-surface-50">
                        <td className="px-4 py-3 text-surface-600 whitespace-nowrap text-xs">{adj.date as unknown as string}</td>
                        <td className="px-4 py-3 font-medium text-surface-800">{adj.ingredient?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPos ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                            {typeInfo?.label ?? adj.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${isPos ? "text-emerald-600" : "text-red-500"}`}>
                          {isPos ? "+" : ""}{fmt3(q)} {adj.ingredient?.unit ?? ""}
                        </td>
                        <td className="px-4 py-3 text-surface-500 text-xs max-w-xs truncate">{adj.reason ?? "—"}</td>
                        <td className="px-4 py-3 text-surface-400 text-xs">{adj.createdBy ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
