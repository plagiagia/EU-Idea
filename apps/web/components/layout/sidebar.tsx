"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, FileUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard" as const, label: "Dashboard", icon: Home },
  { href: "/dashboard/importers" as const, label: "Importers", icon: Building2 },
  { href: "/dashboard/imports" as const, label: "Import Files", icon: FileUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      <div className="p-4">
        <Link href="/" className="text-sm font-bold tracking-tight">
          CBAM Tracker
        </Link>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Button
              key={item.href}
              variant={active ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-2", active && "font-semibold")}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
      <Separator />
      <div className="p-2">
        <Button variant="ghost" className="w-full justify-start gap-2" disabled>
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>
    </aside>
  );
}
