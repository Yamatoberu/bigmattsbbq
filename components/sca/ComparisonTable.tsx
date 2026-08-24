import Link from "next/link";

import type { ComparisonTableModel } from "../../lib/sca/types";

const LINK_CLASSES =
  "min-h-[44px] inline-flex items-center text-smoke-800 hover:text-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500";

const HEADER_CELL_BASE =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.25em] whitespace-nowrap";

const BEST_COLUMN_ACCENT = "border-l border-ember-500/40";

export function ComparisonTable({
  model,
  caption
}: {
  model: ComparisonTableModel;
  caption?: string;
}) {
  if (model.columns.length === 0) {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-smoke-800">No cooks recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              <th scope="col" className={HEADER_CELL_BASE} />
              {model.columns.map((column) => {
                const isBest = column.kind === "best";
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={
                      HEADER_CELL_BASE +
                      " " +
                      (isBest ? "text-gold-300 " + BEST_COLUMN_ACCENT : "text-smoke-800")
                    }
                  >
                    {column.href ? (
                      <Link href={column.href} className={LINK_CLASSES}>
                        {column.label}
                      </Link>
                    ) : (
                      column.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.key} className="border-t border-[#3a2a20]">
                <th
                  scope="row"
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.25em] text-smoke-800 whitespace-nowrap"
                >
                  {row.label}
                </th>
                {model.columns.map((column, index) => {
                  const isBest = column.kind === "best";
                  return (
                    <td
                      key={column.key}
                      className={
                        "px-3 py-2 text-sm text-[#f7f1e6] whitespace-nowrap" +
                        (isBest ? " " + BEST_COLUMN_ACCENT : "")
                      }
                    >
                      {row.cells[index]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
