"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import { MegaMenu } from "./MegaMenu";
import { tools } from "@/lib/tools";

const navLinks = [
  { href: "/edit-pdf", label: "Edit" },
  { href: "/compress-pdf", label: "Compress" },
  { href: "/merge-pdf", label: "Merge" },
  { href: "/split-pdf", label: "Split" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

const heroPagePaths = new Set([
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  ...tools.map((tool) => `/${tool.slug}`),
]);

export function Navbar() {
  const pathname = usePathname();
  const isHeroPage = heroPagePaths.has(pathname);
  // Every tool/workspace page needs its full height for the actual tool —
  // a header pinned at the top while scrolling just eats space there for no
  // benefit. Only the home page keeps the header fixed while scrolling.
  const isHomePage = pathname === "/";
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (!isHeroPage) return;
    function onScroll() {
      setIsScrolled(window.scrollY > 20);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHeroPage]);

  const blended = isHeroPage && !isScrolled;

  return (
    <div
      className={`navbar ${isHomePage ? "sticky top-0" : "relative"} z-40 gap-2 px-4 transition-colors sm:px-8 ${
        blended
          ? "border-b border-transparent bg-transparent"
          : "border-b border-base-300 bg-base-100/80 shadow-sm backdrop-blur-md"
      }`}
    >
      {blended && (
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: "radial-gradient(circle, var(--color-base-content) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
            opacity: 0.18,
          }}
        />
      )}

      <div className="flex flex-1 items-center">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-base-content">
          <Image src="/logo.png" alt="Gojli" width={32} height={32} priority className="h-8 w-8 rounded-lg" />
          Gojli
        </Link>
        <ul className="ml-6 hidden items-center gap-5 text-sm font-medium text-base-content/70 lg:flex">
          <li>
            <MegaMenu />
          </li>
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-primary">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/pricing"
          className="hidden px-2 text-sm font-medium text-base-content/70 hover:text-primary lg:flex"
        >
          Pricing
        </Link>
        <LanguageSwitcher />
        <ThemeToggle />
        <UserMenu />
        <MobileMenu />
      </div>
    </div>
  );
}
