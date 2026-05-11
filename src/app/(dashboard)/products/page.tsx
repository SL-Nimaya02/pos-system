"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Trash2, Tag } from "lucide-react";
import toast from "react-hot-toast";

type ProductForm = {
  name: string; price: string; cost: string; stock: string;
  sku: string; description: string; taxRate: string; categoryId: string;
};

const emptyForm: ProductForm = {
  name: "", price: "", cost: "", stock: "0",
  sku: "", description: "", taxRate: "10", categoryId: "",
};

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  // Category form state
  const [catForm, setCatForm] = useState({ name: "", color: "#6366f1" });
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery({ activeOnly: false });
  const { data: categories } = trpc.categories.list.useQuery();

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
      });
    } else {
      createProduct.mutate({
        ...form, stock: parseInt(form.stock),
        categoryId: form.categoryId || undefined,
      });
    }
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
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Products</h1>
          <p className="text-sm text-surface-400">{products?.length ?? 0} total products</p>
        </div>
        {activeTab === "products" ? (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Product
          </button>
        ) : (
          <button onClick={() => { setEditCatId(null); setCatForm({ name: "", color: "#6366f1" }); setShowCatForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Category
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mb-6 w-fit">
        {(["products", "categories"] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === t ? "bg-white text-brand-700 shadow-sm" : "text-surface-500 hover:text-surface-700"
            }`}>
            {t === "categories" && <Tag size={14} />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
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
                <h2 className="font-semibold text-surface-800">{editId ? "Edit Product" : "New Product"}</h2>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-surface-400 hover:text-surface-600">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {f("Name *", "name")}
                {f("SKU", "sku")}
                {f("Price (LKR) *", "price", "number", { step: "0.01" })}
                {f("Cost (LKR)", "cost", "number", { step: "0.01" })}
                {f("Stock", "stock", "number")}
                {f("Tax Rate (%)", "taxRate", "number")}
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-surface-600 mb-1">Description</label>
                  <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-surface-600 mb-1">Category</label>
                  <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">No category</option>
                    {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSave}
                  disabled={!form.name || !form.price || createProduct.isPending || updateProduct.isPending}
                  className="btn-primary">
                  {createProduct.isPending || updateProduct.isPending ? "Saving..." : editId ? "Update Product" : "Save Product"}
                </button>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {/* Product Table */}
          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-surface-400 text-sm">Loading...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Product</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500">Category</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Price (LKR)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500">Stock</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500">Active</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {products?.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-surface-800">{p.name}</p>
                        {p.sku && <p className="text-xs text-surface-400">SKU: {p.sku}</p>}
                        {p.description && <p className="text-xs text-surface-300 truncate max-w-xs">{p.description}</p>}
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
                        <button onClick={() => openEdit(p)} className="text-surface-400 hover:text-brand-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
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
                <h2 className="font-semibold text-surface-800">{editCatId ? "Edit Category" : "New Category"}</h2>
                <button onClick={() => { setShowCatForm(false); setEditCatId(null); }} className="text-surface-400 hover:text-surface-600"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Category Name *</label>
                  <input className="input" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Beverages" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Colour</label>
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
                  {editCatId ? "Update Category" : "Save Category"}
                </button>
                <button onClick={() => { setShowCatForm(false); setEditCatId(null); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="card overflow-hidden">
            {categories?.length === 0 ? (
              <div className="p-8 text-center text-surface-400 text-sm">No categories yet. Click &ldquo;Add Category&rdquo; to create one.</div>
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
