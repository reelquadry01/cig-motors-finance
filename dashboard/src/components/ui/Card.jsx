export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface rounded-lg border border-white/5 p-5 ${className}`}>
      {children}
    </div>
  )
}
