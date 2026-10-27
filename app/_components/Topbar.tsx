interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/90 backdrop-blur-sm px-8 py-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <span>📅</span>
        <span>
          {new Date().toLocaleDateString('en-PH', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
          })}
        </span>
      </div>
    </header>
  );
}
