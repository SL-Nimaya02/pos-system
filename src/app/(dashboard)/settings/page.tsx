import { Settings } from "lucide-react";

export default function SettingsPage() {
  const sections = [
    {
      title: "Store Details",
      desc: "Business name, address, currency, and contact info",
    },
    {
      title: "Tax Configuration",
      desc: "Default tax rates and per-category tax rules",
    },
    {
      title: "Receipt Settings",
      desc: "Customise receipt header, footer, and print format",
    },
    {
      title: "Payment Methods",
      desc: "Enable or disable cash, card, and Stripe Terminal",
    },
    {
      title: "User Management",
      desc: "Invite staff, assign roles, and set permissions",
    },
  ];

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <Settings size={24} className="text-brand-600" />
          Settings
        </h1>
        <p className="text-sm text-surface-400 mt-1">Configure your POS system preferences</p>
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <div
            key={s.title}
            className="card p-5 flex items-center justify-between gap-4 opacity-60 cursor-not-allowed"
          >
            <div>
              <h3 className="font-semibold text-surface-800 text-sm">{s.title}</h3>
              <p className="text-xs text-surface-400 mt-0.5">{s.desc}</p>
            </div>
            <span className="text-xs bg-surface-100 text-surface-400 px-3 py-1 rounded-full font-medium shrink-0">
              Coming Soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
