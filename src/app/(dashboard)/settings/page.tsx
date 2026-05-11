"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Store, Receipt, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

interface StoreSettings {
  storeName: string;
  currency: string;
  phone: string;
  address: string;
  receiptFooter: string;
  taxRate: string;
  allowCash: boolean;
  allowCard: boolean;
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
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(defaults);
  const [activeTab, setActiveTab] = useState<"store" | "receipt" | "payment">("store");

  useEffect(() => {
    const stored = localStorage.getItem("pos_settings");
    if (stored) {
      try { setSettings({ ...defaults, ...JSON.parse(stored) }); } catch {}
    }
  }, []);

  const save = () => {
    localStorage.setItem("pos_settings", JSON.stringify(settings));
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
    { id: "store" as const, label: "Store Details", icon: Store },
    { id: "receipt" as const, label: "Receipt", icon: Receipt },
    { id: "payment" as const, label: "Payment", icon: CreditCard },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Settings size={24} className="text-brand-600" /> Settings
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
            <h2 className="font-semibold text-surface-800">Store Information</h2>
            {field("Store Name", "storeName", "text", "e.g. My POS Store")}
            {field("Currency", "currency", "text", "e.g. LKR, USD")}
            {field("Phone Number", "phone", "tel", "e.g. +94 77 123 4567")}
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">Address</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Store address..."
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">Default Tax Rate (%)</label>
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
            <h2 className="font-semibold text-surface-800">Receipt Settings</h2>
            <div>
              <label className="block text-xs font-semibold text-surface-600 mb-1.5 uppercase tracking-wider">Receipt Footer Message</label>
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
            <h2 className="font-semibold text-surface-800">Payment Methods</h2>
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
          <Save size={16} /> Save Settings
        </button>
      </div>
    </div>
  );
}
