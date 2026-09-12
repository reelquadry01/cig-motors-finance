export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="border-t border-white pt-4 mb-4 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <span className="text-xs text-muted mt-1 block">{subtitle}</span>}
      </div>
      {action}
    </div>
  )
}
