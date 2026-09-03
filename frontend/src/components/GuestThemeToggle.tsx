'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/cn';

export default function GuestThemeToggle({
  className,
  floating = false,
}: {
  className?: string;
  /** Coin écran (Gate / chargement) quand le shell n’est pas encore là. */
  floating?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl border border-border bg-surface text-muted hover:text-foreground hover:bg-surface-muted transition shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        floating && 'fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-[210]',
        className,
      )}
      aria-label={isLight ? 'Activer le mode sombre' : 'Activer le mode clair'}
      title={isLight ? 'Mode sombre' : 'Mode clair'}
    >
      {isLight ? <Moon className="w-3.5 h-3.5" aria-hidden /> : <Sun className="w-3.5 h-3.5" aria-hidden />}
    </button>
  );
}
