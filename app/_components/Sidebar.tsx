'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from '../_lib/supabase';
import type { Role } from '../_lib/types';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const NAV: Record<Role, NavItem[]> = {
  owner: [
    { label: 'Overview',        href: '/owner',             icon: '🏠' },
    { label: 'Expenses',        href: '/owner#expenses',    icon: '💸' },
    { label: 'Rent Collection', href: '/owner#rent',        icon: '💰' },
    { label: 'Contractors',     href: '/owner#contractors', icon: '👷' },
  ],
  manager: [
    { label: 'Overview',       href: '/manager',              icon: '🏢' },
    { label: 'Complaints',     href: '/manager#complaints',   icon: '📋' },
    { label: 'Announcements',  href: '/manager#announcements',icon: '📢' },
  ],
  handyman: [
    { label: 'My Tasks',      href: '/handyman',            icon: '🛠️' },
    { label: 'Materials Log', href: '/handyman#materials',  icon: '📦' },
    { label: 'Photo Upload',  href: '/handyman#photos',     icon: '📷' },
  ],
  tenant: [
    { label: 'Overview',        href: '/tenant',           icon: '🏡' },
    { label: 'Pay Rent',        href: '/tenant#pay',       icon: '💳' },
    { label: 'Submit Request',  href: '/tenant#submit',    icon: '📝' },
    { label: 'Track Repairs',   href: '/tenant#track',     icon: '🔍' },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  owner:    'Property Owner',
  manager:  'Property Manager',
  handyman: 'Handyman',
  tenant:   'Tenant',
};

const ROLE_COLORS: Record<Role, string> = {
  owner:    'bg-amber-500',
  manager:  'bg-blue-600',
  handyman: 'bg-emerald-600',
  tenant:   'bg-violet-600',
};

interface SidebarProps {
  role: Role;
  userName: string;
  userAvatar: string;
}

export default function Sidebar({ role, userName, userAvatar }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  async function handleSignOut() {
    try { await signOut(); } finally { router.replace('/login'); }
  }

  function handleNav(href: string) {
    const [path] = href.split('#');
    if (pathname === path) {
      // Already on the right page — just update the hash so the page
      // can respond to the hashchange event without a full navigation.
      router.push(href);
    } else {
      router.push(href);
    }
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-200 bg-white">

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white text-lg">🏗️</div>
        <div>
          <p className="text-sm font-bold text-zinc-900 leading-tight">ResideHub</p>
          <p className="text-[10px] text-zinc-400">Maintenance Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV[role].map((item) => {
          const [itemPath, itemHash] = item.href.split('#');
          const active =
            pathname === itemPath &&
            (itemHash ? hash === `#${itemHash}` : !hash || hash === '');

          return (
            <button
              key={item.href}
              onClick={() => handleNav(item.href)}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left
                ${active
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-zinc-100 px-5 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${ROLE_COLORS[role]}`}>
            {userAvatar}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-800 truncate">{userName}</p>
            <p className="text-[10px] text-zinc-400">{ROLE_LABELS[role]}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          <span>↩</span> Sign Out
        </button>
      </div>

    </aside>
  );
}
