"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
      <div className="text-7xl select-none">📡</div>
      <h1 className="text-2xl font-bold text-gray-800">You are offline</h1>
      <p className="max-w-sm text-base text-gray-500">
        Sales will resume when your connection is restored. Any transactions
        completed before going offline have already been saved.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow hover:bg-indigo-700 active:scale-95 transition"
      >
        Try again
      </button>
    </div>
  );
}
