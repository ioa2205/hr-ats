"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { LocaleSwitcher } from "./locale-switcher";
import { LandingThemeToggle } from "./landing-theme-toggle";

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
  themeToggle: string;
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
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections = items
      .map((it) => document.getElementById(it.id))
      .filter((n): n is HTMLElement => n !== null);
    if (!sections.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const s of sections) io.observe(s);
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (ev: KeyboardEvent<Document> | globalThis.KeyboardEvent) => {
      if (ev.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstMobileLinkRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-lg focus:bg-[var(--ikat)] focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-semibold focus:text-[var(--color-on-primary)]"
      >
        {labels.sectionsHeading}
      </a>

      <nav
        aria-label="Primary"
        className="sticky top-0 z-50 transition-[box-shadow,border-color,background-color] duration-200"
        style={{
          background: scrolled ? "color-mix(in srgb, var(--paper) 80%, transparent)" : "transparent",
          backdropFilter: scrolled ? "saturate(150%) blur(18px)" : "none",
          WebkitBackdropFilter: scrolled ? "saturate(150%) blur(18px)" : "none",
          borderBottom: `1px solid ${scrolled ? "var(--rule)" : "transparent"}`,
          boxShadow: scrolled ? "var(--shadow-level-1)" : "none",
          fontFamily: "var(--font-manrope),sans-serif",
        }}
      >
        <div className="mx-auto flex items-center gap-6" style={{ maxWidth: 1200, padding: "12px 24px" }}>
          <Link href={homeHref} className="inline-flex items-center" aria-label="TezHR — home">
            <span className="hidden md:inline">{brand}</span>
            <span className="md:hidden">{brandMobile}</span>
          </Link>

          <ul className="hidden list-none gap-1 p-0 text-[14px] font-medium md:flex" style={{ color: "var(--ink-3)" }}>
            {items.map((it) => {
              const isActive = active === it.id;
              return (
                <li key={it.id} className="relative">
                  <a
                    href={it.href}
                    className="inline-flex items-center rounded-lg px-3 py-2 transition-colors hover:text-[var(--ink)]"
                    aria-current={isActive ? "true" : undefined}
                    style={{ color: isActive ? "var(--ink)" : undefined }}
                  >
                    {it.label}
                  </a>
                  <span
                    aria-hidden
                    className="absolute inset-x-3 -bottom-[3px] h-[2px] origin-center rounded-full bg-[var(--ikat)] transition-transform duration-200"
                    style={{ transform: isActive ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2.5">
              <LandingThemeToggle label={labels.themeToggle} />
              <LocaleSwitcher />
              <Link
                href={loginHref}
                className="rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors hover:bg-[var(--paper-2)]"
                style={{ color: "var(--ink)" }}
              >
                {labels.signin}
              </Link>
            </div>
            <Link href={signupHref} className="btn-primary" style={{ minHeight: 40, padding: "9px 16px", fontSize: 14 }}>
              {labels.cta}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-lg border md:hidden"
              style={{ borderColor: "var(--rule-strong)" }}
              aria-label={labels.menuOpen}
              aria-expanded={menuOpen}
              aria-controls="tezhr-mobile-menu"
            >
              <span aria-hidden className="flex flex-col gap-[4px]">
                <span className="block h-[2px] w-[17px] rounded-full bg-[var(--ink)]" />
                <span className="block h-[2px] w-[17px] rounded-full bg-[var(--ink)]" />
                <span className="block h-[2px] w-[17px] rounded-full bg-[var(--ink)]" />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div
          id="tezhr-mobile-menu"
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={labels.sectionsHeading}
          className="fixed inset-0 z-[70] flex flex-col"
          style={{ background: "var(--paper)" }}
        >
          <div className="flex items-center justify-between" style={{ padding: "14px 20px", borderBottom: "1px solid var(--rule)" }}>
            {brandMobile}
            <button
              type="button"
              onClick={closeMenu}
              className="grid h-10 w-10 place-items-center rounded-lg border"
              style={{ borderColor: "var(--rule-strong)" }}
              aria-label={labels.menuClose}
            >
              <span aria-hidden className="text-[20px] leading-none">×</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-7">
            <div className="lp-eyebrow is-plain mb-4">{labels.sectionsHeading}</div>
            <ul className="m-0 flex list-none flex-col gap-0 p-0">
              {items.map((it, idx) => (
                <li key={it.id}>
                  <a
                    ref={idx === 0 ? firstMobileLinkRef : undefined}
                    href={it.href}
                    onClick={closeMenu}
                    className="block py-4 text-[24px] tracking-[-0.02em] transition-colors hover:text-[var(--ikat)]"
                    style={{ fontWeight: 700, borderBottom: "1px solid var(--rule)", color: "var(--ink)" }}
                  >
                    {it.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-3">
              <Link
                href={loginHref}
                onClick={closeMenu}
                className="btn-ghost w-full"
              >
                {labels.signin}
              </Link>
              <Link href={signupHref} onClick={closeMenu} className="btn-primary w-full">
                {labels.cta}
              </Link>
            </div>
            <div className="mt-7 flex items-center gap-2.5">
              <LocaleSwitcher />
              <LandingThemeToggle label={labels.themeToggle} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
