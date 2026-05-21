"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Trash2, Tag, Search, ChevronDown, ChevronRight, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

type VariantForm = { name: string; value: string; priceDiff: string; stock: string; sku: string; barcode: string };
const emptyVariantForm: VariantForm = { name: "", value: "", priceDiff: "0", stock: "0", sku: "", barcode: "" };

type ProductForm = {
  name: string; price: string; cost: string; stock: string;
  sku: string; description: string; taxRate: string; categoryId: string;
  warrantyInfo: string;
};

const emptyForm: ProductForm = {
  name: "", price: "", cost: "", stock: "0",
  sku: "", description: "", taxRate: "10", categoryId: "",
  warrantyInfo: "",
};

export default function ProductsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  // Variants state
  const [expandedVariantProductId, setExpandedVariantProductId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariantForm);
  const [editVariantId, setEditVariantId] = useState<string | null>(null);
  const [showVariantForm, setShowVariantForm] = useState(false);

  // Category form state
  const [catForm, setCatForm] = useState({ name: "", color: "#6366f1" });
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery({ activeOnly: false });
  const { data: categories } = trpc.categories.list.useQuery();

  const filteredProducts = (products ?? []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
  });

  const createCategory = trpc.categories.create.useMutation({
    onSuccess: () => { toast.success("Category created!"); utils.categories.list.invalidate(); setCatForm({ name: "", color: "#6366f1" }); setShowCatForm(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateCategory = trpc.categories.update.useMutation({
    onSuccess: () => { toast.success("Category updated!"); utils.categories.list.invalidate(); setEditCatId(null); setShowCatForm(false); setCatForm({ name: "", color: "#6366f1" }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCategory = trpc.categories.delete.useMutation({
    onSuccess: () => { toast.success("Category deleted"); utils.categories.list.invalidate(); utils.products.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product created!");
      utils.products.list.invalidate();
      setShowForm(false); setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Updated!");
      utils.products.list.invalidate();
      setEditId(null); setShowForm(false); setForm(emptyForm);
    },
    onError: (e) => toast.error(e.message),
  });

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };

  const openEdit = (p: NonNullable<typeof products>[number]) => {
    setEditId(p.id);
    setForm({
      name: p.name, price: p.price, cost: p.cost ?? "",
      stock: String(p.stock), sku: p.sku ?? "",
      description: p.description ?? "", taxRate: p.taxRate ?? "0",
      categoryId: p.categoryId ?? "",
      warrantyInfo: p.warrantyInfo ?? "",
    });
    setShowForm(true);
  };

  const openEditCat = (c: NonNullable<typeof categories>[number]) => {
    setEditCatId(c.id);
    setCatForm({ name: c.name, color: c.color ?? "#6366f1" });
    setShowCatForm(true);
  };

  const handleSave = () => {
    if (editId) {
      updateProduct.mutate({
        id: editId, name: form.name, price: form.price,
        stock: parseInt(form.stock), categoryId: form.categoryId || undefined,
        warrantyInfo: form.warrantyInfo || undefined,
      });
    } else {
      createProduct.mutate({
        ...form, stock: parseInt(form.stock),
        categoryId: form.categoryId || undefined,
        warrantyInfo: form.warrantyInfo || undefined,
      });
    }
  };

  // Variant helpers
  const openAddVariant = (productId: string) => {
    setExpandedVariantProductId(productId);
    setEditVariantId(null);
    setVariantForm(emptyVariantForm);
    setShowVariantForm(true);
  };

  const f = (label: string, key: keyof ProductForm, type = "text", props = {}) => (
    <div key={key}>
      <label className="block text-xs font-medium text-surface-600 mb-1">{label}</label>
      <input
        className="input" type={type} {...props}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{t.products.title}</h1>
          <p className="text-sm text-surface-400">{products?.length ?? 0} {t.products.totalCount}</p>
        </div>
        {activeTab === "products" ? (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t.products.addProduct}
          </button>
        ) : (
          <button onClick={() => { setEditCatId(null); setCatForm({ name: "", color: "#6366f1" }); setShowCatForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> {t.products.addCategory}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mb-6 w-fit">
        {(["products", "categories"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab ? "bg-white text-brand-700 shadow-sm" : "text-surface-500 hover:text-surface-700"
            }`}>
            {tab === "categories" && <Tag size={14} />}
            {tab === "products" ? t.products.tabs.products : t.products.tabs.categories}
          </button>
        ))}
      </div>

      {/* Products tab content */}
      {activeTab === "products" && (
        <>
          {/* Add / Edit Product Form */}
          {showForm && (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-surface-800">{editId ? t.products.editProduct : t.products.newProduct}</h2>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-surface-400 hover:text-surface-600">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {f(t.products.nameField, "name")}
                {f(t.products.sku, "sku")}
                {f(t.products.priceLKR, "price", "number", { step: "0.01" })}
                {f(t.products.costLKR, "cost", "number", { step: "0.01" })}
                {f(t.products.stock, "stock", "number")}
                {f(t.products.taxRateLabel, "taxRate", "number")}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-surface-600 mb-1">{t.products.descriptionField}</label>
                  <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-surface-600 mb-1">Warranty Info</label>
                  <input
                    className="input"
                    placeholder="e.g. 1 year manufacturer warranty"
                    value={form.warrantyInfo}
                    onChange={(e) => setForm({ ...form, warrantyInfo: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-surface-600 mb-1">{t.products.categoryHeader}</label>
                  <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">{t.products.noCategory}</option>
                    {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSave}
                  disabled={!form.name || !form.price || createProduct.isPending || updateProduct.isPending}
                  className="btn-primary">
                  {createProduct.isPending || updateProduct.isPending ? t.common.saving : editId ? t.products.updateProduct : t.products.saveProduct}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Product Table */}
          <div className="card overflow-hidden">
            {isLoading ? (
                  <div className="p-8 text-center text-surface-400 text-sm">{t.common.loading}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.products.productName}</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">{t.products.categoryHeader}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.products.priceHeader}</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">{t.products.stockHeader}</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">{t.products.activeHeader}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-surface-800">{p.name}</p>
                        {p.sku && <p className="text-xs text-surface-400">SKU: {p.sku}</p>}
                        {p.description && <p className="text-xs text-surface-300 truncate max-w-xs">{p.description}</p>}
                        {p.warrantyInfo && <p className="text-xs text-amber-600 truncate max-w-xs">🛡 {p.warrantyInfo}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-surface-500">{p.category?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-600">{parseFloat(p.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${p.stock <= 0 ? "text-red-500" : p.stock <= 5 ? "text-amber-500" : "text-green-600"}`}>{p.stock}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => updateProduct.mutate({ id: p.id, isActive: !p.isActive })} className={p.isActive ? "text-green-500" : "text-surface-300"}>
                          {p.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setExpandedVariantProductId((id) => id === p.id ? null : p.id)}
                            title="Manage variants"
                            className="text-surface-400 hover:text-purple-600 transition-colors"
                          >
                            <Layers size={14} />
                          </button>
                          <button onClick={() => openEdit(p)} className="text-surface-400 hover:text-brand-600 transition-colors">
                            <Pencil size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedVariantProductId === p.id && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-4 bg-purple-50/40">
                          <VariantsPanel
                            productId={p.id}
                            productPrice={p.price}
                            showForm={showVariantForm && expandedVariantProductId === p.id}
                            setShowForm={setShowVariantForm}
                            variantForm={variantForm}
                            setVariantForm={setVariantForm}
                            editVariantId={editVariantId}
                            setEditVariantId={setEditVariantId}
                            onAddClick={() => openAddVariant(p.id)}
                          />
                        </td>
                      </tr>
                    )}
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Categories tab content */}
      {activeTab === "categories" && (
        <>
          {/* Category Form */}
          {showCatForm && (
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-surface-800">{editCatId ? t.products.editCategory : t.products.addCategory}</h2>
                <button onClick={() => { setShowCatForm(false); setEditCatId(null); }} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">{t.products.categoryName} *</label>
                  <input className="input" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Beverages" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">{t.products.color}</label>
                  <div className="flex items-center gap-3">
                    <input type="color" className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} />
                    <input className="input flex-1" value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} placeholder="#6366f1" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => editCatId
                    ? updateCategory.mutate({ id: editCatId, name: catForm.name, color: catForm.color })
                    : createCategory.mutate(catForm)
                  }
                  disabled={!catForm.name}
                  className="btn-primary"
                >
                  {editCatId ? t.products.updateCategory : t.products.saveCategory}
                </button>
                <button onClick={() => { setShowCatForm(false); setEditCatId(null); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="card overflow-hidden">
            {categories?.length === 0 ? (
              <div className="p-8 text-center text-surface-400 text-sm">{t.products.noCategoriesYet}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Category</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Colour</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Products</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {categories?.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-50">
                      <td className="px-4 py-3 font-medium text-surface-800">{c.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full border border-surface-200" style={{ background: c.color ?? "#6366f1" }} />
                          <span className="text-xs text-surface-400 font-mono">{c.color}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-surface-500">
                        {products?.filter((p) => p.categoryId === c.id).length ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditCat(c)} className="text-surface-400 hover:text-brand-600 transition-colors"><Pencil size={14} /></button>
                          <button
                            onClick={() => { if (confirm(`Delete "${c.name}"? Products in this category will be uncategorised.`)) deleteCategory.mutate({ id: c.id }); }}
                            className="text-surface-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── VariantsPanel ─────────────────────────────────────────────────────────────
function VariantsPanel({
  productId,
  productPrice,
  showForm,
  setShowForm,
  variantForm,
  setVariantForm,
  editVariantId,
  setEditVariantId,
  onAddClick,
}: {
  productId: string;
  productPrice: string;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  variantForm: VariantForm;
  setVariantForm: (f: VariantForm) => void;
  editVariantId: string | null;
  setEditVariantId: (id: string | null) => void;
  onAddClick: () => void;
}) {
  const utils = trpc.useUtils();
  const { data: variants, isLoading } = trpc.variants.list.useQuery({ productId });

  const createVariant = trpc.variants.create.useMutation({
    onSuccess: () => { toast.success("Variant added"); utils.variants.list.invalidate({ productId }); setShowForm(false); setVariantForm({ name: "", value: "", priceDiff: "0", stock: "0", sku: "", barcode: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const updateVariant = trpc.variants.update.useMutation({
    onSuccess: () => { toast.success("Variant updated"); utils.variants.list.invalidate({ productId }); setShowForm(false); setEditVariantId(null); setVariantForm({ name: "", value: "", priceDiff: "0", stock: "0", sku: "", barcode: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const deleteVariant = trpc.variants.delete.useMutation({
    onSuccess: () => { toast.success("Variant removed"); utils.variants.list.invalidate({ productId }); },
    onError: (e) => toast.error(e.message),
  });

  const handleSaveVariant = () => {
    if (editVariantId) {
      updateVariant.mutate({
        id: editVariantId,
        name: variantForm.name,
        value: variantForm.value,
        priceDiff: variantForm.priceDiff,
        stock: parseInt(variantForm.stock) || 0,
        sku: variantForm.sku || null,
        barcode: variantForm.barcode || null,
      });
    } else {
      createVariant.mutate({
        productId,
        name: variantForm.name,
        value: variantForm.value,
        priceDiff: variantForm.priceDiff || "0",
        stock: parseInt(variantForm.stock) || 0,
        sku: variantForm.sku || undefined,
        barcode: variantForm.barcode || undefined,
      });
    }
  };

  const openEditVariant = (v: NonNullable<typeof variants>[number]) => {
    setEditVariantId(v.id);
    setVariantForm({
      name: v.name,
      value: v.value,
      priceDiff: v.priceDiff,
      stock: String(v.stock),
      sku: v.sku ?? "",
      barcode: v.barcode ?? "",
    });
    setShowForm(true);
  };

  const basePrice = parseFloat(productPrice);

  return (
    <div className="mt-3 rounded-xl border border-purple-100 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-purple-50 border-b border-purple-100">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
          <Layers size={12} /> Variants
        </span>
        <button
          onClick={onAddClick}
          className="flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors"
        >
          <Plus size={12} /> Add variant
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-purple-50 bg-purple-50/30">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Attribute *</label>
              <input className="input text-sm" placeholder="e.g. Size, Colour" value={variantForm.name} onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Value *</label>
              <input className="input text-sm" placeholder="e.g. L, Red" value={variantForm.value} onChange={(e) => setVariantForm({ ...variantForm, value: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Price Diff (LKR)</label>
              <input className="input text-sm" type="number" step="0.01" placeholder="0.00" value={variantForm.priceDiff} onChange={(e) => setVariantForm({ ...variantForm, priceDiff: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Stock</label>
              <input className="input text-sm" type="number" value={variantForm.stock} onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">SKU</label>
              <input className="input text-sm" placeholder="Optional" value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Barcode</label>
              <input className="input text-sm" placeholder="Optional" value={variantForm.barcode} onChange={(e) => setVariantForm({ ...variantForm, barcode: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveVariant}
              disabled={!variantForm.name || !variantForm.value || createVariant.isPending || updateVariant.isPending}
              className="btn-primary text-xs py-1.5"
            >
              {createVariant.isPending || updateVariant.isPending ? "Saving…" : editVariantId ? "Update" : "Add Variant"}
            </button>
            <button onClick={() => { setShowForm(false); setEditVariantId(null); }} className="btn-secondary text-xs py-1.5">Cancel</button>
          </div>
        </div>
      )}

      {/* Variants table */}
      {isLoading ? (
        <p className="text-xs text-surface-400 px-4 py-3">Loading…</p>
      ) : !variants?.length ? (
        <p className="text-xs text-surface-400 px-4 py-3">No variants yet. Click "Add variant" to create one.</p>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-surface-50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-surface-500">Attribute</th>
              <th className="text-left px-3 py-2 font-semibold text-surface-500">Value</th>
              <th className="text-right px-3 py-2 font-semibold text-surface-500">Price</th>
              <th className="text-right px-3 py-2 font-semibold text-surface-500">Stock</th>
              <th className="text-left px-3 py-2 font-semibold text-surface-500">SKU / Barcode</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-50">
            {variants.map((v) => {
              const finalPrice = basePrice + parseFloat(v.priceDiff);
              const diff = parseFloat(v.priceDiff);
              return (
                <tr key={v.id} className="hover:bg-surface-50">
                  <td className="px-3 py-2 text-surface-700">{v.name}</td>
                  <td className="px-3 py-2 font-medium text-surface-800">{v.value}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-semibold text-brand-600">{finalPrice.toFixed(2)}</span>
                    {diff !== 0 && (
                      <span className={`ml-1 ${diff > 0 ? "text-green-600" : "text-red-500"}`}>
                        ({diff > 0 ? "+" : ""}{diff.toFixed(2)})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={v.stock <= 0 ? "text-red-500 font-medium" : "text-surface-700"}>{v.stock}</span>
                  </td>
                  <td className="px-3 py-2 text-surface-400">
                    {v.sku && <span className="mr-2">{v.sku}</span>}
                    {v.barcode && <span className="text-surface-300">🔲 {v.barcode}</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditVariant(v)} className="text-surface-400 hover:text-brand-600">
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remove variant "${v.name}: ${v.value}"?`)) deleteVariant.mutate({ id: v.id }); }}
                        className="text-surface-400 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

