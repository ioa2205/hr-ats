"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LocaleSwitcher } from "./locale-switcher";

interface Item {
  id: string;
  href: string;
  label: string;
}

interface Labels {
  signin: string;
  cta: string;
  menuOpen: string;
  menuClose: string;
  sectionsHeading: string;
}

interface Props {
  items: Item[];
  labels: Labels;
  signupHref: string;
  loginHref: string;
  brand: ReactNode;
  brandMobile: ReactNode;
  homeHref: string;
}

export function ScrollSpyNav({
  items,
  labels,
  signupHref,
  loginHref,
  brand,
  brandMobile,
  homeHref,
}: Props) {
  const pathname = usePathname();
  const [section, setSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const firstMobileLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (pathname !== "/" || typeof IntersectionObserver === "undefined") return;
    const sections = items
      .filter((item) => item.href.includes("#"))
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setSection(visible[0].target.id);
      },
      { rootMargin: "-34% 0px -55%", threshold: [0.05, 0.25, 0.5] },
    );
    sections.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items, pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    firstMobileLinkRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const isActive = (item: Item) => {
    if (item.href.includes("#")) return pathname === "/" && section === item.id;
    return pathname === item.href;
  };

  return (
    <>
      <a href="#main" className="craft-skip-link">
        {labels.sectionsHeading}
      </a>
      <header className="craft-nav-shell">
        <nav className="craft-nav" aria-label="Primary">
          <Link href={homeHref} className="craft-nav-brand" aria-label="TezHR — home">
            <span className="craft-brand-desktop">{brand}</span>
            <span className="craft-brand-mobile">{brandMobile}</span>
          </Link>
          <ul className="craft-nav-links">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={item.href} aria-current={isActive(item) ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="craft-nav-actions">
            <LocaleSwitcher size="sm" />
            <Link href={loginHref} className="craft-nav-signin">
              {labels.signin}
            </Link>
            <Link href={signupHref} className="craft-button craft-button-sage craft-nav-cta">
              {labels.cta}
            </Link>
            <button
              type="button"
              className="craft-menu-button"
              onClick={() => setMenuOpen(true)}
              aria-label={labels.menuOpen}
              aria-expanded={menuOpen}
              aria-controls="marketing-mobile-menu"
            >
              <span aria-hidden />
              <span aria-hidden />
              <span aria-hidden />
            </button>
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div
          id="marketing-mobile-menu"
          className="craft-mobile-menu craft-paper"
          role="dialog"
          aria-modal="true"
          aria-label={labels.sectionsHeading}
        >
          <div className="craft-mobile-menu-head">
            {brandMobile}
            <button type="button" onClick={closeMenu} aria-label={labels.menuClose}>
              ×
            </button>
          </div>
          <nav aria-label={labels.sectionsHeading}>
            {items.map((item, index) => (
              <Link
                key={item.id}
                ref={index === 0 ? firstMobileLinkRef : undefined}
                href={item.href}
                onClick={closeMenu}
                aria-current={isActive(item) ? "page" : undefined}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="craft-mobile-menu-actions">
            <LocaleSwitcher />
            <Link href={loginHref} onClick={closeMenu} className="craft-text-link">
              {labels.signin}
            </Link>
            <Link href={signupHref} onClick={closeMenu} className="craft-button craft-button-sage">
              {labels.cta}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
