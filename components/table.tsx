import { ReactNode } from "react";

export function DataTable({
  headers,
  rows
}: {
  headers: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-black/5">
      <table className="min-w-full divide-y divide-black/5 text-sm">
        <thead className="bg-sand/70">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left font-semibold text-ink">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 bg-white">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 align-top text-ink/85">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
