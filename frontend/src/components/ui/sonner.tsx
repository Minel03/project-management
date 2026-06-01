'use client';

import { useSyncExternalStore } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useTheme } from '@/context/ThemeContext';

function subscribeToDocumentTheme(onStoreChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', onStoreChange);
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => {
    media.removeEventListener('change', onStoreChange);
    observer.disconnect();
  };
}

function getResolvedTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'dark') return 'dark';
  if (theme === 'light') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function Toaster({ ...props }: ToasterProps) {
  const { theme } = useTheme();

  const resolvedTheme = useSyncExternalStore<'light' | 'dark'>(
    subscribeToDocumentTheme,
    () => getResolvedTheme(theme),
    () => 'light',
  );

  return (
    <Sonner
      theme={resolvedTheme}
      className='toaster group'
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
