import React from 'react';
import { cn } from '@/lib/cn';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

const variants = {
  error: {
    container: 'bg-danger/10 border-danger/25 text-danger',
    icon: 'text-danger',
    Icon: AlertCircle,
  },
  success: {
    container: 'bg-primary/10 border-primary/25 text-primary',
    icon: 'text-primary',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'bg-festive-accent-soft border-festive-accent/30 text-festive-accent',
    icon: 'text-festive-accent',
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
  id?: string;
}

export default function Alert({ variant = 'info', title, children, className, icon, id }: AlertProps) {
  const config = variants[variant];
  const IconComponent = config.Icon;

  return (
    <div
      id={id}
      role="alert"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      tabIndex={variant === 'error' ? -1 : undefined}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border text-sm leading-relaxed',
        config.container,
        className,
      )}
    >
      <span className={cn('shrink-0 mt-0.5', config.icon)}>
        {icon ?? <IconComponent className="w-5 h-5" aria-hidden />}
      </span>
      <div className="min-w-0">
        {title && <p className="font-semibold mb-0.5 text-foreground">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
