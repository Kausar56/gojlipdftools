import { ToolIcon } from "./icons";

type CellValue = boolean | string;

const rows: { feature: string; free: CellValue; pro: CellValue; business: CellValue }[] = [
  { feature: "Core PDF tools (merge, split, compress, rotate, watermark)", free: true, pro: true, business: true },
  { feature: "Password protect and unlock", free: true, pro: true, business: true },
  { feature: "Max file size", free: "25 MB", pro: "200 MB", business: "1 GB" },
  { feature: "Word, Excel, PowerPoint conversions", free: false, pro: true, business: true },
  { feature: "Batch processing", free: false, pro: true, business: true },
  { feature: "Priority processing", free: false, pro: true, business: true },
  { feature: "Team members", free: "1", pro: "1", business: "Up to 10" },
  { feature: "Support", free: "Community", pro: "Email", business: "Priority + phone" },
  { feature: "Custom watermark branding", free: false, pro: false, business: true },
  { feature: "Usage analytics dashboard", free: false, pro: false, business: true },
];

function Cell({ value }: { value: CellValue }) {
  if (typeof value === "string") {
    return <span className="text-sm text-base-content/80">{value}</span>;
  }
  return value ? (
    <ToolIcon name="check" className="mx-auto h-4 w-4 text-secondary" />
  ) : (
    <span className="text-base-content/30">—</span>
  );
}

export function PricingTable() {
  return (
    <div className="bg-base-100 py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-8">
        <h2 className="text-center text-2xl font-semibold text-base-content sm:text-3xl">Compare plans</h2>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-150 text-left">
            <thead>
              <tr className="border-b border-base-300">
                <th className="py-3 pr-4 text-sm font-medium text-base-content/60">Feature</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-base-content">Free</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-primary">Pro</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-base-content">Business</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature} className="border-b border-base-300/60">
                  <td className="py-3 pr-4 text-sm text-base-content/80">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.free} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.pro} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Cell value={row.business} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
