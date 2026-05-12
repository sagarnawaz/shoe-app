"use client";

import { useGetSyncStatus } from "@/lib/data-hooks";
import { RefreshCw } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  const { data: sync } = useGetSyncStatus();

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold leading-tight truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Sync status dot */}
          <div
            className="flex items-center gap-1"
            title={sync?.connected ? "Google Sheets synced" : "Not synced"}
            data-testid="sync-status"
          >
            {sync?.pendingChanges && sync.pendingChanges > 0 ? (
              <RefreshCw size={12} className="text-amber-500 animate-spin" />
            ) : (
              <span
                className={`w-2 h-2 rounded-full ${
                  sync?.connected ? "bg-emerald-500" : "bg-slate-400"
                }`}
              />
            )}
          </div>
          {action}
        </div>
      </div>
    </header>
  );
}
