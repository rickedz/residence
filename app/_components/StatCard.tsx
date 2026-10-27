interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'violet';
  icon: string;
}

const ACCENT: Record<string, string> = {
  blue:    'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber:   'bg-amber-50 text-amber-600',
  red:     'bg-red-50 text-red-600',
  violet:  'bg-violet-50 text-violet-600',
};

export default function StatCard({ label, value, sub, accent = 'blue', icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${ACCENT[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-zinc-900 truncate">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
