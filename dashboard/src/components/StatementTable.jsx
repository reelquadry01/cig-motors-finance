import Card from './ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td } from './ui/Table'
import { fmtM } from '../lib/format'

export default function StatementTable({ title, subtitle, rows, cols, totals, highlight = [] }) {
  const highlightSet = new Set(highlight)
  return (
    <Card className="overflow-x-auto">
      <div className="mb-3">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
      </div>
      <Table>
        <Thead>
          <Tr>
            <Th></Th>
            {cols.map(c => <Th key={c.key} align="right">{c.label}</Th>)}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, i) => (
            <Tr key={i} highlight={highlightSet.has(row.label)}>
              <Td className="text-muted font-medium">{row.label}</Td>
              {cols.map(c => (
                <Td key={c.key} align="right" className="tabular-nums">
                  {fmtM(row.values?.[c.key])}
                </Td>
              ))}
            </Tr>
          ))}
          {totals && (
            <Tr className="font-semibold border-t border-white/20">
              <Td>{totals.label}</Td>
              {cols.map(c => (
                <Td key={c.key} align="right" className="tabular-nums">
                  {fmtM(totals.values?.[c.key])}
                </Td>
              ))}
            </Tr>
          )}
        </Tbody>
      </Table>
    </Card>
  )
}
