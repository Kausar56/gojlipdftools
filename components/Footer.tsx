import Link from "next/link";
import { tools } from "@/lib/tools";

const coreTools = tools.filter((tool) => tool.category === "core");
const convertTools = tools.filter((tool) => tool.category === "convert");

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function Footer() {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-5 sm:px-8">
        <div className="col-span-2">
          <p className="text-lg font-semibold text-base-content">Gojli</p>
          <p className="mt-2 max-w-xs text-sm text-base-content/70">
            Efficient document workflows for the modern professional.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-base-content">Tools</p>
          <ul className="mt-3 space-y-2 text-sm text-base-content/70">
            {coreTools.map((tool) => (
              <li key={tool.slug}>
                <Link href={`/${tool.slug}`} className="hover:text-primary">
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-base-content">Convert</p>
          <ul className="mt-3 space-y-2 text-sm text-base-content/70">
            {convertTools.map((tool) => (
              <li key={tool.slug}>
                <Link href={`/${tool.slug}`} className="hover:text-primary">
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-base-content">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-base-content/70">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-primary">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-base-300 py-4 text-center text-xs text-base-content/60">
        © {new Date().getFullYear()} Gojli. Efficient document workflows.
      </div>
    </footer>
  );
}
