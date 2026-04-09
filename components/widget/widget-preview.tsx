"use client";

export function WidgetPreview({ agentName }: { agentName: string }) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {/* Fake browser chrome */}
      <div className="bg-gray-100 border-b px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 max-w-md mx-auto">
          <div className="bg-white rounded-md border px-3 py-1 text-xs text-gray-400 text-center">
            yourwebsite.com.au
          </div>
        </div>
      </div>

      {/* Fake website content */}
      <div className="relative bg-gradient-to-b from-gray-50 to-white h-[280px] sm:h-[320px] p-8">
        {/* Fake page content lines */}
        <div className="max-w-md">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-3 bg-gray-100 rounded w-full mb-2" />
          <div className="h-3 bg-gray-100 rounded w-5/6 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-4/6 mb-6" />
          <div className="h-8 bg-gray-200 rounded-md w-32" />
        </div>

        {/* Widget bubble - bottom right */}
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col items-end gap-3">
          {/* Chat tooltip */}
          <div className="bg-white rounded-xl shadow-lg border px-4 py-3 max-w-[200px] animate-fade-in">
            <p className="text-xs font-medium text-[#0A1628] mb-0.5">
              {agentName}
            </p>
            <p className="text-[11px] text-gray-500">
              Hi! How can I help you today?
            </p>
          </div>
          {/* Widget button */}
          <div className="w-14 h-14 rounded-full bg-[#F5A623] shadow-lg flex items-center justify-center cursor-default hover:scale-105 transition-transform">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0A1628"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
        </div>

        {/* Label */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/20 px-3 py-1 text-xs font-medium text-[#F5A623]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
            Preview
          </span>
        </div>
      </div>
    </div>
  );
}
