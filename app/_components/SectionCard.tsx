interface SectionCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
        <h2 className="font-semibold text-zinc-800">{title}</h2>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
