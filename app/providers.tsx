"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthGate from "@/components/AuthGate";
import PwaRegister from "@/components/PwaRegister";
import OfflineNotice from "@/components/OfflineNotice";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthGate>
          <div className="min-h-screen bg-background">
            {children}
            <BottomNav />
          </div>
        </AuthGate>
        <OfflineNotice />
        <PwaRegister />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
