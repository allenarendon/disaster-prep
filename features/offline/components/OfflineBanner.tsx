"use client";

export function OfflineBanner({
  generatedAt,
  isStale,
}: {
  generatedAt?: string;
  isStale?: boolean;
}) {
  const formatted = generatedAt
    ? new Date(generatedAt).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "unknown time";

  return (
    <div className="border-b border-ph-gold bg-ph-gold-light px-4 py-2 text-sm text-ph-blue-dark">
      <strong>Offline mode</strong> — showing last saved information from{" "}
      {formatted}.
      {isStale && (
        <span className="ml-1 font-medium">
          This information may be outdated. Connect to refresh when possible.
        </span>
      )}
    </div>
  );
}

export function FirstTimeOfflineState() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-ph-blue/20 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Connect briefly to get started
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        You need an internet connection at least once to download offline
        guidance and evacuation center information. Please connect and reload
        this page.
      </p>
    </div>
  );
}
