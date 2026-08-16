import React from 'react';
import { cn } from '@/lib/cn';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

const variants = {
  error: {
    container: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300',
    icon: 'text-rose-500',
    Icon: AlertCircle,
  },
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300',
    icon: 'text-emerald-500',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300',
    icon: 'text-amber-500',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-primary/10 border-primary/20 text-primary',
    icon: 'text-primary',
    Icon: Info,
  },
} as const;

export interface AlertProps {
  variant?: keyof typeof variants;
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export default function Alert({ variant = 'info', title, children, className, icon }: AlertProps) {
  const config = variants[variant];
  const IconComponent = config.Icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border text-sm leading-relaxed',
        config.container,
        className,
      )}
    >
      <span className={cn('shrink-0 mt-0.5', config.icon)}>
        {icon ?? <IconComponent className="w-5 h-5" />}
      </span>
      <div className="min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
