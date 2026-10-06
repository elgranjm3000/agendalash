'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Users,
  ClipboardList,
  Home,
  Stethoscope,
  FileText,
  CreditCard,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Activity,
  Boxes,
  Sparkles,
  Bell,
  Hospital,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useLang } from '@/contexts/i18n-context';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  {
    href: '/panel',
    label: 'nav.dashboard',
    icon: Home,
    roles: ['admin', 'doctor', 'nurse', 'receptionist'],
  },
  {
    href: '/patients',
    label: 'nav.patients',
    icon: Users,
    roles: ['admin', 'doctor', 'nurse', 'receptionist'],
  },
  {
    href: '/appointments',
    label: 'nav.appointments',
    icon: ClipboardList,
    roles: ['admin', 'doctor', 'nurse', 'receptionist'],
  },
  {
    href: '/calendar',
    label: 'nav.calendar',
    icon: Calendar,
    roles: ['admin'],
  },
  {
    href: '/triage',
    label: 'nav.triage',
    icon: Activity,
    roles: ['admin', 'nurse', 'receptionist'],
  },
  {
    href: '/inventory',
    label: 'nav.inventory',
    icon: Boxes,
    roles: ['admin', 'nurse'],
  },
  {
    href: '/insumos',
    label: 'nav.supplies',
    icon: Sparkles,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/recetas',
    label: 'nav.recipes',
    icon: ClipboardList,
    roles: ['admin', 'nurse', 'super_admin'],
  },
  {
    href: '/alertas',
    label: 'nav.alerts',
    icon: Bell,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/records',
    label: 'nav.records',
    icon: Stethoscope,
    roles: ['admin', 'doctor', 'nurse'],
  },
  {
    href: '/prescriptions',
    label: 'nav.prescriptions',
    icon: FileText,
    roles: ['admin', 'doctor'],
  },
  {
    href: '/invoices',
    label: 'nav.invoices',
    icon: CreditCard,
    roles: ['admin', 'receptionist'],
  },
  {
    href: '/cash',
    label: 'nav.cash',
    icon: Wallet,
    roles: ['admin', 'receptionist'],
  },
  {
    href: '/reports',
    label: 'nav.reports',
    icon: BarChart3,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/users',
    label: 'nav.users',
    icon: Settings,
    roles: ['admin', 'super_admin'],
  },
  {
    href: '/organizations',
    label: 'nav.organizations',
    icon: Hospital,
    roles: ['super_admin'],
  },
  {
    href: '/audit',
    label: 'nav.audit',
    icon: ShieldCheck,
    roles: ['super_admin'],
  },
];

function UserAvatar({ user, size = 'sm' }: { user: NonNullable<ReturnType<typeof useAuth>['user']>; size?: 'sm' | 'md' }) {
  const dimension = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';

  if (user.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar}
        alt={`${user.firstName} ${user.lastName}`}
        className={cn(dimension, 'rounded-full object-cover ring-1 ring-black/10 shrink-0')}
      />
    );
  }
  return (
    <div className={cn(dimension, 'bg-rose-100 rounded-full flex items-center justify-center shrink-0')}>
      <span className="text-sm font-medium text-rose-700">
        {user.firstName[0]}{user.lastName[0]}
      </span>
    </div>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const allowedNavItems = navItems.filter(item => item.roles.includes(user.role));

  const navLinkClasses = (isActive: boolean) =>
    cn(
      'flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'text-rose-600 bg-rose-50'
        : 'text-gray-600 hover:text-rose-600 hover:bg-gray-50'
    );

  const closeAndNavigate = () => setMobileOpen(false);

  const langSwitcher = (
    <div className="flex items-center rounded-md border border-gray-200 overflow-hidden" role="group" aria-label="Idioma / Language">
      {(['es', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            'px-2 py-1.5 text-xs font-semibold uppercase transition-colors min-h-[32px]',
            lang === l ? 'bg-rose-600 text-white' : 'text-gray-500 hover:bg-gray-50'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* Barra superior móvil/tablet */}
      <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4 gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="min-h-[40px] min-w-[40px]" aria-label={t('nav.openMenu')}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="px-4 py-4 border-b border-gray-100">
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <Stethoscope className="h-5 w-5 text-rose-600" />
                    AgendaLash
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-[calc(100%-5rem)]">
                  <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {allowedNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeAndNavigate}
                          className={cn(navLinkClasses(isActive), 'px-3 py-2.5 text-base min-h-[44px]')}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span>{t(item.label)}</span>
                        </Link>
                      );
                    })}
                  </nav>
                  <div className="p-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-3 py-2">
                      <UserAvatar user={user} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{t('role.' + user.role)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={logout}
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('nav.logout')}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/panel" className="flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-rose-600" />
              <span className="text-lg font-bold text-gray-900">AgendaLash</span>
            </Link>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {langSwitcher}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="min-h-[40px] px-2">
                  <UserAvatar user={user} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('nav.myAccount')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>{t('nav.myProfile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('nav.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Sidebar fija (desktop) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-gray-200 z-50">
        <div className="flex items-center gap-2 h-16 px-5 border-b border-gray-100 shrink-0">
          <Stethoscope className="h-7 w-7 text-rose-600" />
          <span className="text-lg font-bold text-gray-900">AgendaLash</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(navLinkClasses(isActive), 'px-3 py-2 min-h-[40px]')}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{t(item.label)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-2 shrink-0">
          <div className="flex justify-center">{langSwitcher}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 min-h-[44px] px-2">
                <UserAvatar user={user} />
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 leading-tight">{t('role.' + user.role)}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel>{t('nav.myAccount')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>{t('nav.myProfile')}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t('nav.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}
