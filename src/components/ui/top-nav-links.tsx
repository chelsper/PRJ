"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

export function TopNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="navlinks" aria-label="Primary">
      {items.map((item: NavItem) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

        return (
          <Link key={item.href} href={item.href} className={active ? "topnav-link active" : "topnav-link"}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
