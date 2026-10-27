export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {children}
    </div>
  );
}
