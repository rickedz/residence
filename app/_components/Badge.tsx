'use client';

type Variant = 'paid' | 'pending' | 'overdue' | 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'low' | 'medium' | 'high' | 'urgent' | 'active' | 'inactive';

const STYLES: Record<Variant, string> = {
  paid:        'bg-emerald-100 text-emerald-800',
  pending:     'bg-amber-100 text-amber-800',
  overdue:     'bg-red-100 text-red-800',
  open:        'bg-sky-100 text-sky-800',
  assigned:    'bg-violet-100 text-violet-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved:    'bg-emerald-100 text-emerald-800',
  closed:      'bg-zinc-100 text-zinc-600',
  low:         'bg-zinc-100 text-zinc-600',
  medium:      'bg-amber-100 text-amber-800',
  high:        'bg-orange-100 text-orange-800',
  urgent:      'bg-red-100 text-red-800',
  active:      'bg-emerald-100 text-emerald-800',
  inactive:    'bg-zinc-100 text-zinc-500',
};

const LABELS: Record<Variant, string> = {
  paid: 'Paid', pending: 'Pending', overdue: 'Overdue',
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  resolved: 'Resolved', closed: 'Closed',
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
  active: 'Active', inactive: 'Inactive',
};

export default function Badge({ variant }: { variant: Variant }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[variant]}`}>
      {LABELS[variant]}
    </span>
  );
}
