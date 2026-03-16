import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/products", label: "Products" },
  { href: "/recommendations", label: "Recommendations" }
];

const manageItems = [
  { href: "/manage/items", label: "Items" },
  { href: "/manage/products", label: "Formulas" },
  { href: "/manage/lots", label: "Lots" },
  { href: "/manage/plans", label: "Plans" },
  { href: "/manage/purchase-orders", label: "POs" },
  { href: "/manage/suppliers", label: "Suppliers" }
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-black/5 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-pine">Skincare Manufacturing</p>
            <h1 className="text-2xl font-semibold text-ink">Inventory Planner</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <nav className="flex gap-2 rounded-full border border-black/5 bg-sand/80 p-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-ink transition hover:bg-white"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <nav className="flex gap-1 rounded-full border border-pine/10 bg-pine/5 p-1">
              <span className="px-2 py-1 text-xs font-medium text-pine/60">Manage:</span>
              {manageItems.map((item) => (
                <Link
                  key={item.href}
                  className="rounded-full px-3 py-1 text-xs font-medium text-pine transition hover:bg-white"
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">{children}</main>
    </div>
  );
}
