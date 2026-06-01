'use client';

import { useRouter } from 'next/navigation';
import {
  History,
  LogOut,
  Monitor,
  Moon,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { getInitials } from '@/lib/utils';
interface DashboardHeaderProps {
  user?: {
    username: string;
    email: string;
    role?: 'admin' | 'leader' | 'member';
  } | null;
  theme?: string;
  onCycleTheme?: () => void;
  onLogout?: () => void;
  loading?: boolean;
}

export function DashboardHeader({
  user = null,
  theme = 'system',
  onCycleTheme = () => {},
  onLogout = () => {},
  loading = false,
}: DashboardHeaderProps) {
  const router = useRouter();

  return (
    <header className='sticky top-0 z-20 shrink-0 border-b border-border bg-card/85 backdrop-blur-md px-6 py-4 flex items-center justify-between transition-colors duration-200'>
      <div className='flex items-center gap-3'>
        {loading ? (
          <div className='h-5 w-48 rounded-md bg-muted animate-pulse' />
        ) : (
          <span className='text-base font-semibold text-foreground font-sans tracking-tight'>
            Project Management Tool
          </span>
        )}
      </div>

      {!loading && user && (
        <div className='flex items-center gap-4'>
          <button
            onClick={onCycleTheme}
            className='py-1.5 px-3 rounded-lg border border-border hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'
            title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to toggle)`}>
            {theme === 'light' && <Sun className='w-3.5 h-3.5' />}
            {theme === 'dark' && <Moon className='w-3.5 h-3.5' />}
            {theme === 'system' && <Monitor className='w-3.5 h-3.5' />}
            <span className='hidden sm:inline font-sans capitalize'>
              {theme === 'system' ? 'System Theme' : `${theme} Mode`}
            </span>
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => router.push('/activity')}
              className='py-1.5 px-3 rounded-lg border border-border hover:border-indigo-500/30 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'>
              <History className='w-3.5 h-3.5' />
              <span className='hidden sm:inline font-sans'>Activity Feed</span>
            </button>
          )}

          {user.role === 'admin' && (
            <button
              onClick={() => router.push('/admin')}
              className='py-1.5 px-3 rounded-lg border border-border hover:border-emerald-500/30 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'>
              <UserIcon className='w-3.5 h-3.5' />
              <span className='hidden sm:inline font-sans'>Admin Console</span>
            </button>
          )}

          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-full bg-muted border border-indigo-500/20 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-300'>
              {getInitials(user.username)}
            </div>
            <div className='hidden sm:block text-left'>
              <p className='text-xs font-semibold text-foreground/90'>
                {user.username}
              </p>
              <p className='text-[10px] text-muted-foreground'>{user.email}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className='py-1.5 px-3 rounded-lg border border-border hover:border-rose-500/30 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 bg-background/50 hover:bg-muted transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer'>
            <LogOut className='w-3.5 h-3.5' />
            <span className='hidden sm:inline font-sans'>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}
