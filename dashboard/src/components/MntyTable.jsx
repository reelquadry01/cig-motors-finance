import Card from './ui/Card'
import { Table, Thead, Th, Tbody, Tr, Td } from './ui/Table'
import { fmtM } from '../lib/format'

export default function MntyTable({ data, columns, title }) {
  const months = data.monthly || []
  if (!months.length) return null

  return (
    <Card className="overflow-x-auto">
      <Table>
        <Thead>
          <Tr>
            <Th>{title || 'Monthly Trend'}</Th>
            {columns.map(c => <Th key={c.key} align="right">{c.label}</Th>)}
            {months.map(m => (
              <Th key={m.month} align="right">{m.month_name?.slice(0, 3)}</Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.rows?.map((row, i) => (
            <Tr key={i}>
              <Td className="text-muted font-medium">{row.label}</Td>
              {columns.map(c => (
                <Td key={c.key} align="right" className="tabular-nums">
                  {fmtM(row.totals?.[c.key])}
                </Td>
              ))}
              {months.map(m => (
                <Td key={m.month} align="right" className="tabular-nums text-muted">
                  {fmtM(row.monthly?.[m.month]?.[c.key])}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Card>
  )
}
