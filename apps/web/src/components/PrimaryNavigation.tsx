"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavigationItem = {
  href: string;
  label: string;
};

export function PrimaryNavigation({
  ariaLabel,
  className,
  items,
}: {
  ariaLabel: string;
  className: string;
  items: NavigationItem[];
}) {
  const pathname = usePathname();
  const [publicPathname, setPublicPathname] = useState<string | null>(null);

  useEffect(() => {
    // Locale-prefixed public URLs are rewritten to locale-neutral app routes.
    // Read the address bar after hydration so active navigation follows the
    // route the visitor sees instead of Next's internal rewrite destination.
    setPublicPathname(window.location.pathname);
  }, [pathname]);

  return (
    <nav className={`nav ${className}`} aria-label={ariaLabel}>
      {items.map((item) => {
        const active = publicPathname === item.href || publicPathname?.startsWith(`${item.href}/`) === true;
        return (
          <Link href={item.href} aria-current={active ? "page" : undefined} key={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
