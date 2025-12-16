import Link from "next/link";
import type { ReactNode } from "react";

type NavLink = {
  href: string;
  label: string;
  icon?: ReactNode;
  ariaLabel?: string;
};

type HeaderProps = {
  title: string;
  subtitle: string;
  description?: string;
  chips?: string[];
  navLinks: NavLink[];
};

export function Header({
  title,
  subtitle,
  description,
  chips = [],
  navLinks,
}: HeaderProps) {
  return (
    <header className="space-y-3 bg-[#0b2447] border border-blue-500/70 rounded-2xl p-4 shadow-md text-slate-50">
      <div className="flex items-center gap-3 justify-between">
        <p className="text-sm font-semibold tracking-wide uppercase leading-tight text-slate-50">
          kamikazes-events
          <br />
          {title}
        </p>
        <nav className="flex gap-2 text-sm items-center">
          {navLinks.map((link) => (
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
        </nav>
      </div>
      <h1 className="text-3xl font-bold text-slate-50 leading-tight">{subtitle}</h1>
      {description && (
        <p className="text-slate-100/80 text-sm">
          {description}
        </p>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-slate-50">
          {chips.map((chip) => (
            <span
              key={chip}
              className="tag bg-white/10 border-blue-400 text-slate-50"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
