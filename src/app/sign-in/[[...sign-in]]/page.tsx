import { SignIn } from "@clerk/nextjs";
import { ShoppingCart } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Column: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-12">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <ShoppingCart size={28} className="text-brand-700" />
            </div>
            <span className="font-bold text-brand-800 text-xl tracking-wide">
              Pos System
            </span>
          </div>

          {/* SignIn Component */}
          <SignIn
            forceRedirectUrl="/pos"
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "shadow-none p-0 bg-transparent w-full",
                card: "bg-transparent shadow-none p-0 w-full",
                headerTitle: "text-3xl font-bold text-surface-900",
                headerSubtitle: "text-sm text-surface-500 mt-2 mb-6",
                socialButtonsBlockButton:
                  "border border-surface-200 text-surface-600 font-medium py-2.5 rounded-lg hover:bg-surface-50 transition-colors",
                dividerLine: "bg-surface-200",
                dividerText: "text-surface-400 text-xs font-medium",
                formFieldLabel: "text-xs font-bold text-surface-700 uppercase tracking-wider mb-1",
                formFieldInput:
                  "w-full px-4 py-3 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all shadow-sm",
                formButtonPrimary:
                  "w-full bg-brand-700 hover:bg-brand-800 text-white font-bold py-3.5 rounded-lg transition-colors mt-2 text-base",
                footerActionText: "text-surface-500 text-sm",
                footerActionLink: "text-brand-700 font-bold hover:text-brand-800",
                identityPreviewText: "text-surface-800 font-medium",
                identityPreviewEditButton: "text-brand-600 hover:text-brand-700",
                formFieldWarningText: "text-xs text-red-500",
                formFieldErrorText: "text-xs text-red-500",
              },
            }}
          />
        </div>
      </div>

      {/* Right Column: Visual */}
      <div className="hidden lg:flex w-1/2 bg-brand-50 relative items-center justify-center overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-100 rounded-full blur-3xl opacity-50 translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white rounded-full blur-3xl opacity-50 -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 flex flex-col items-center justify-center p-12 max-w-lg text-center">
          <div className="w-64 h-64 bg-brand-800 rounded-full shadow-2xl flex items-center justify-center mb-10 relative">
            <div className="absolute top-4 left-[-40px] bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-brand-500"></span>
               <span className="text-xs font-bold text-surface-800">100% In Stock</span>
            </div>
            <div className="absolute bottom-4 right-[-40px] bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2">
               <span className="text-xs font-bold text-surface-800">Daily Revenue</span>
               <span className="text-sm font-bold text-brand-700">+$1,240</span>
            </div>
            <span className="text-8xl">🛍️</span>
          </div>
          
          <h2 className="text-3xl font-bold text-brand-900 mb-4">
            Fast, Fresh, and Precise Inventory.
          </h2>
          <p className="text-brand-700 leading-relaxed max-w-md mx-auto opacity-80">
            Manage your point-of-sale transactions with our intelligent inventory tracking and lightning-fast checkout experience.
          </p>
        </div>
      </div>
    </div>
  );
}
