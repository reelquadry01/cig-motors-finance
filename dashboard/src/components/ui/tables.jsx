export function StatementTable({ data, columns, className = '' }) {
  if (!data || data.length === 0) return <div className="py-4 text-soft text-sm">No data available</div>

  const numCols = columns.filter(c => c.align === 'right').length

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-table-body border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col, i) => (
              <th key={i} className={`table-header font-medium pb-3 ${i === 0 ? 'text-left pr-8' : 'text-right pl-4'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className="table-row">
              {columns.map((col, ci) => (
                <td key={ci} className={`py-2.5 ${ci === 0 ? 'pr-8 text-left' : 'text-right tabular-nums pl-4'}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CompactTable({ data, columns, className = '' }) {
  if (!data || data.length === 0) return <div className="py-4 text-soft text-sm">No data</div>

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-table-body border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            {columns.map((col, i) => (
              <th key={i} className={`table-header font-medium pb-2 ${i === 0 ? 'text-left pr-6' : 'text-right pl-3'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className="border-b border-white/5">
              {columns.map((col, ci) => (
                <td key={ci} className={`py-1.5 ${ci === 0 ? 'pr-6 text-left' : 'text-right tabular-nums pl-3'}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
