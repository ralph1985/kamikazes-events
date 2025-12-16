import Link from "next/link";
import type { ReactNode } from "react";

type NavLink = {
  href: string;
  label: string;
  icon?: ReactNode;
  ariaLabel?: string;
};

type PageNavProps = {
  links: NavLink[];
  label: string;
};

export function PageNav({ links, label }: PageNavProps) {
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-3 justify-between">
      <p className="text-sm font-semibold tracking-wide uppercase leading-tight text-slate-50">
        kamikazes-events
        <br />
        {label}
      </p>
      <div className="flex gap-2 text-sm items-center">
        {links.map((link) => (
          <Link
            key={link.href}
            className="tag bg-white/10 border-blue-400 text-slate-50"
            href={link.href}
            aria-label={link.ariaLabel || link.label}
            title={link.label}
          >
            {link.icon ? link.icon : link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
