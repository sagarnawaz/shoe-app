"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Receipt, Download } from "lucide-react";

const tabs = [
  { href: "/", label: "ڈیش بورڈ", sublabel: "Dashboard", icon: LayoutDashboard },
  { href: "/stock", label: "اسٹاک", sublabel: "Stock", icon: Package },
  { href: "/expenses", label: "اخراجات", sublabel: "Expenses", icon: Receipt },
  { href: "/export", label: "ایکسپورٹ", sublabel: "Export", icon: Download },
];

export default function BottomNav() {
  const location = usePathname() ?? "/";

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom"
      data-testid="bottom-nav"
    >
      <div className="flex">
        {tabs.map(({ href, label, sublabel, icon: Icon }) => {
          const active =
            href === "/"
              ? location === "/" || location === ""
              : location.startsWith(href);
          return (
            <Link key={href} href={href} className="flex-1">
              <div
                className={`flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
                  active
                    ? "text-primary"
                    : "text-muted-foreground active:text-foreground"
                }`}
                data-testid={`nav-${sublabel.toLowerCase()}`}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.75}
                  className="transition-all"
                />
                <span className="text-[10px] font-medium leading-tight">{label}</span>
                <span className="text-[9px] leading-none opacity-60">{sublabel}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
