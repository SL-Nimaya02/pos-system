"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Save, Store, Receipt, CreditCard, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";
import { trpc } from "@/lib/trpc";

interface StoreSettings {
  storeName: string;
  currency: string;
  phone: string;
  address: string;
  receiptFooter: string;
  taxRate: string;
  allowCash: boolean;
  allowCard: boolean;
  logo: string;
}

const defaults: StoreSettings = {
  storeName: "POS System",
  currency: "LKR",
  phone: "",
  address: "",
  receiptFooter: "Thank you for your purchase!",
  taxRate: "10",
  allowCash: true,
  allowCard: true,
  logo: "",
};

export default function SettingsPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<StoreSettings>(defaults);
  const [activeTab, setActiveTab] = useState<"store" | "receipt" | "payment">("store");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: dbSettings, isLoading } = trpc.settings.getAll.useQuery();
  const upsertMany = trpc.settings.upsertMany.useMutation();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2 MB");
    const reader = new FileReader();
    reader.onload = () => setSettings((s) => ({ ...s, logo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (dbSettings && Object.keys(dbSettings).length > 0) {
      setSettings({
        ...defaults,
        ...dbSettings,
        allowCash: dbSettings.allowCash !== "false",
        allowCard: dbSettings.allowCard !== "false",
      });
    } else {
      // fallback: try localStorage migration
      try {
        const stored = localStorage.getItem("pos_settings");
        if (stored) setSettings({ ...defaults, ...JSON.parse(stored) });
      } catch {}
    }
  }, [dbSettings]);

  const save = async () => {
    await upsertMany.mutateAsync({
      storeName:      settings.storeName,
      currency:       settings.currency,
      phone:          settings.phone,
      address:        settings.address,
      receiptFooter:  settings.receiptFooter,
      taxRate:        settings.taxRate,
      allowCash:      String(settings.allowCash),
      allowCard:      String(settings.allowCard),
      logo:           settings.logo,
    });
    toast.success("Settings saved!");
  };

  const field = (label: string, key: keyof StoreSettings, type = "text", placeholder = "") => (
    <div key={key}>
      <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        className="input"
        placeholder={placeholder}
        value={settings[key] as string}
        onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
      />
    </div>
  );

  const tabs = [
    { id: "store" as const, label: t.settings.storeDetails, icon: Store },
    { id: "receipt" as const, label: t.settings.receiptTab, icon: Receipt },
    { id: "payment" as const, label: t.settings.paymentTab, icon: CreditCard },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Settings size={24} className="text-brand-600" /> {t.settings.title}
        </h1>
        <p className="text-sm text-surface-400 mt-1">Configure your POS system preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 p-1 rounded-xl mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? "bg-white text-brand-700 shadow-sm"
                : "text-surface-500 hover:text-surface-700"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="card p-6 space-y-5">
        {activeTab === "store" && (
          <>
            <h2 className="font-semibold text-surface-800">{t.settings.storeInformation}</h2>
            {/* Logo upload */}
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">Store Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl border-2 border-dashed border-surface-300 bg-surface-50 flex items-center justify-center overflow-hidden shrink-0">
                  {settings.logo
                    ? <img src={settings.logo} alt="logo" className="w-full h-full object-contain" />
                    : <Store size={28} className="text-surface-300" />}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors"
                  >
                    <Upload size={14} /> Upload Logo
                  </button>
                  {settings.logo && (
                    <button
                      type="button"
                      onClick={() => { setSettings((s) => ({ ...s, logo: "" })); if (logoInputRef.current) logoInputRef.current.value = ""; }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <X size={14} /> Remove
                    </button>
                  )}
                  <p className="text-xs text-surface-400">PNG, JPG or SVG · max 2 MB</p>
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
            {field(t.settings.storeName, "storeName", "text", "e.g. My POS Store")}
            {field(t.settings.currency, "currency", "text", "e.g. LKR, USD")}
            {field(t.settings.phoneNumber, "phone", "tel", "e.g. +94 77 123 4567")}
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.settings.addressField}</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Store address..."
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.settings.defaultTaxRate}</label>
              <input
                type="number"
                className="input"
                placeholder="e.g. 10"
                value={settings.taxRate}
                onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
              />
            </div>
          </>
        )}

        {activeTab === "receipt" && (
          <>
            <h2 className="font-semibold text-surface-800">{t.settings.receiptSettings}</h2>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">{t.settings.receiptFooterMsg}</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="e.g. Thank you for your purchase!"
                value={settings.receiptFooter}
                onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
              />
              <p className="text-xs text-surface-400 mt-1">This message appears at the bottom of every receipt.</p>
            </div>
            <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Preview</p>
              <div className="text-center space-y-1">
                {settings.logo && <img src={settings.logo} alt="logo" className="w-16 h-16 object-contain mx-auto mb-1" />}
                <p className="font-bold text-surface-800">{settings.storeName}</p>
                {settings.phone && <p className="text-xs text-surface-500">{settings.phone}</p>}
                {settings.address && <p className="text-xs text-surface-500">{settings.address}</p>}
                <div className="border-t border-dashed border-surface-300 my-2" />
                <p className="text-xs text-surface-500 italic">{settings.receiptFooter}</p>
              </div>
            </div>
          </>
        )}

        {activeTab === "payment" && (
          <>
            <h2 className="font-semibold text-surface-800">{t.settings.paymentMethods}</h2>
            <p className="text-sm text-surface-400">Choose which payment methods are available at checkout.</p>
            <div className="space-y-3">
              {[
                { key: "allowCash" as const, label: "Cash", desc: "Accept cash payments with change calculation" },
                { key: "allowCard" as const, label: "Card", desc: "Accept card / digital payments" },
              ].map((m) => (
                <div key={m.key} className="flex items-center justify-between p-4 rounded-xl border border-surface-200 bg-surface-50">
                  <div>
                    <p className="text-sm font-semibold text-surface-800">{m.label}</p>
                    <p className="text-xs text-surface-400">{m.desc}</p>
                  </div>
                  <button
                    onClick={() => setSettings({ ...settings, [m.key]: !settings[m.key] })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${settings[m.key] ? "bg-brand-600" : "bg-surface-300"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${settings[m.key] ? "left-6" : "left-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={save}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2"
        >
          <Save size={16} /> {t.settings.saveSettings}
        </button>
      </div>
    </div>
  );
}
