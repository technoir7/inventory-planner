import Link from "next/link";
import { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/products", label: "Products" },
  { href: "/recommendations", label: "Recommendations" }
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
        </div>
      </header>
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">{children}</main>
    </div>
  );
}
