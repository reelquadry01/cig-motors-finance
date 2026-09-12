const variants = {
  success: 'bg-fav/10 text-fav',
  danger: 'bg-unfav/10 text-unfav',
  warning: 'bg-yellow-500/10 text-yellow-400',
  neutral: 'bg-white/5 text-muted',
}

export default function Badge({ children, variant = 'neutral' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${variants[variant]}`}>
      {children}
    </span>
  )
}
