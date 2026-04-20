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
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 200);
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
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-sm focus:bg-[var(--ink)] focus:px-3 focus:py-2 focus:text-[13px] focus:text-[var(--paper-3)]"
      >
        {labels.sectionsHeading}
      </a>

      <nav
        aria-label="Primary"
        className={[
          "tezhr-nav",
          "transition-[transform,background-color,box-shadow] duration-300",
          stuck
            ? "fixed inset-x-0 top-0 z-50 translate-y-0 border-b border-[var(--ink)] bg-[rgba(239,232,219,0.92)] backdrop-blur-md"
            : "relative",
        ].join(" ")}
        style={{ fontFamily: "var(--font-manrope),sans-serif" }}
      >
        <div
          className="mx-auto flex items-center gap-6"
          style={{ maxWidth: 1360, padding: stuck ? "12px 28px" : "18px 28px" }}
        >
          <Link
            href={homeHref}
            className="inline-flex items-center"
            aria-label="TezHR — home"
          >
            <span className="hidden md:inline">{brand}</span>
            <span className="md:hidden">{brandMobile}</span>
          </Link>

          <ul
            className="hidden list-none gap-7 p-0 text-[13px] font-medium md:flex"
            style={{ color: "var(--ink-2)" }}
          >
            {items.map((it) => {
              const isActive = active === it.id;
              return (
                <li key={it.id} className="relative">
                  <a
                    href={it.href}
                    className="inline-block py-1 transition-colors hover:text-[var(--ink)]"
                    aria-current={isActive ? "true" : undefined}
                    style={{ color: isActive ? "var(--ink)" : undefined }}
                  >
                    {it.label}
                  </a>
                  <span
                    aria-hidden
                    className="absolute inset-x-0 -bottom-[1px] h-[1.5px] origin-left bg-[var(--persimmon)] transition-transform duration-200"
                    style={{ transform: isActive ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <LocaleSwitcher />
              <Link
                href={loginHref}
                className="border border-[var(--ink)] px-[14px] py-2 text-[13px] transition-colors hover:bg-[var(--ink)] hover:text-[var(--paper-3)]"
              >
                {labels.signin}
              </Link>
            </div>
            <Link
              href={signupHref}
              className="btn-primary"
              style={{
                padding: stuck ? "8px 14px" : "9px 16px",
                fontSize: 13,
                boxShadow: "3px 3px 0 var(--persimmon)",
              }}
            >
              {labels.cta}
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="grid h-9 w-9 place-items-center border border-[var(--ink)] md:hidden"
              aria-label={labels.menuOpen}
              aria-expanded={menuOpen}
              aria-controls="tezhr-mobile-menu"
            >
              <span aria-hidden className="flex flex-col gap-[3.5px]">
                <span className="block h-[1.5px] w-[16px] bg-[var(--ink)]" />
                <span className="block h-[1.5px] w-[16px] bg-[var(--ink)]" />
                <span className="block h-[1.5px] w-[16px] bg-[var(--ink)]" />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {stuck && <div aria-hidden style={{ height: 62 }} />}

      {menuOpen && (
        <div
          id="tezhr-mobile-menu"
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label={labels.sectionsHeading}
          className="fixed inset-0 z-[70] flex flex-col bg-[var(--paper)] paper-grain"
        >
          <div
            className="flex items-center justify-between border-b border-[var(--ink)]"
            style={{ padding: "18px 24px" }}
          >
            {brandMobile}
            <button
              type="button"
              onClick={closeMenu}
              className="grid h-9 w-9 place-items-center border border-[var(--ink)]"
              aria-label={labels.menuClose}
            >
              <span aria-hidden className="text-[18px] leading-none">×</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div
              className="mb-4 text-[10px] tracking-[0.2em]"
              style={{
                color: "var(--ink-3)",
                fontFamily: "var(--font-jetbrains-mono),monospace",
              }}
            >
              {labels.sectionsHeading}
            </div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {items.map((it, idx) => (
                <li key={it.id}>
                  <a
                    ref={idx === 0 ? firstMobileLinkRef : undefined}
                    href={it.href}
                    onClick={closeMenu}
                    className="serif block border-b border-[var(--ink-4)] py-4 text-[28px] leading-tight tracking-[-0.02em] transition-colors hover:text-[var(--persimmon-2)]"
                  >
                    {it.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href={loginHref}
                onClick={closeMenu}
                className="w-full border border-[var(--ink)] px-5 py-3 text-center text-[14px] font-medium"
              >
                {labels.signin}
              </Link>
              <Link
                href={signupHref}
                onClick={closeMenu}
                className="btn-primary w-full justify-center"
                style={{ padding: "14px 20px", fontSize: 14 }}
              >
                {labels.cta}
              </Link>
            </div>
            <div className="mt-8">
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
