export function Table({ children, className = '' }) {
  return (
    <table className={`w-full ${className}`}>{children}</table>
  )
}

export function Thead({ children }) {
  return <thead className="border-b border-white/10">{children}</thead>
}

export function Th({ children, align = 'left', className = '', colSpan }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return (
    <th colSpan={colSpan} className={`px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted font-medium ${alignClass} ${className}`}>
      {children}
    </th>
  )
}

export function Tbody({ children }) {
  return <tbody>{children}</tbody>
}

export function Tr({ children, className = '', highlight = false }) {
  return (
    <tr className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${highlight ? 'font-semibold' : ''} ${className}`}>
      {children}
    </tr>
  )
}

export function Td({ children, align = 'left', className = '', colSpan }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  return <td colSpan={colSpan} className={`px-4 py-2.5 text-sm ${alignClass} ${className}`}>{children}</td>
}
