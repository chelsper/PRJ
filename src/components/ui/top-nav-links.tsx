"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavItem = {
  href: string;
  label: string;
};

export function TopNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <nav className={`navlinks primary-navigation${open ? " is-open" : ""}`} aria-label="Primary" onKeyDown={(event) => {
      if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); }
    }}>
      <button ref={toggle} className="mobile-menu-toggle secondary" type="button" aria-expanded={open} aria-controls="primary-navigation-links" onClick={() => setOpen(!open)}>
        {open ? "Close menu" : "Menu"}<span aria-hidden="true">{open ? " −" : " +"}</span>
      </button>
      <div id="primary-navigation-links" className="primary-navigation-links">
      {items.map((item: NavItem) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

        return (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={active ? "topnav-link active" : "topnav-link"}>
            {item.label}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
