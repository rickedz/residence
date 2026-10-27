const COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
];

function colorFromInitials(initials: string) {
  const sum = initials.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}

interface AvatarProps {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

export default function Avatar({ initials, size = 'md' }: AvatarProps) {
  return (
    <div className={`${SIZE[size]} ${colorFromInitials(initials)} rounded-full flex items-center justify-center font-semibold text-white select-none shrink-0`}>
      {initials}
    </div>
  );
}
