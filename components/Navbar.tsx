import Link from "next/link";
import { ToolIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";
import { MegaMenu } from "./MegaMenu";

const navLinks = [
  { href: "/compress-pdf", label: "Compress" },
  { href: "/merge-pdf", label: "Merge" },
  { href: "/split-pdf", label: "Split" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  return (
    <div className="navbar sticky top-0 z-40 gap-2 border-b border-base-300 bg-base-100 px-4 sm:px-8">
      <div className="flex flex-1 items-center">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-base-content">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-content">
            <ToolIcon name="merge" className="h-5 w-5" />
          </span>
          PDFFlow
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
        <label className="input input-bordered input-sm hidden items-center gap-2 lg:flex">
          <ToolIcon name="search" className="h-3.5 w-3.5 text-base-content/50" />
          <input type="text" placeholder="Search tools..." className="grow" />
        </label>
        <ThemeToggle />
        <button type="button" className="btn btn-primary btn-sm hidden lg:inline-flex">
          Sign In
          <span className="badge badge-ghost badge-xs">Soon</span>
        </button>
        <MobileMenu />
      </div>
    </div>
  );
}
