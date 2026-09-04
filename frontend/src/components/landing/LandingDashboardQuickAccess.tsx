'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LandingDashboardQuickAccess() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user]);

  if (!user || !visible) return null;

  return (
    <div className="fixed bottom-36 sm:bottom-24 right-4 sm:right-6 z-40 animate-fade-in pointer-events-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-surface/90 dark:bg-surface/90 backdrop-blur-md border border-primary/40 text-foreground text-xs sm:text-sm font-semibold shadow-xl shadow-primary/15 hover:scale-105 hover:border-primary transition-all duration-200 group active:scale-95"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <LayoutDashboard className="w-4 h-4 text-primary group-hover:rotate-6 transition-transform" />
        <span className="font-bold">Mon Tableau de bord</span>
        <ArrowRight className="w-3.5 h-3.5 text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </Link>
    </div>
  );
}
