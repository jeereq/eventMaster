import Link from 'next/link';
import UserGuideView from '@/components/guide/UserGuideView';
import { PartyPopper, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Aide invité — EventMaster',
  description: 'Guide pour confirmer votre RSVP, consulter votre placement et utiliser le portail invité EventMaster.',
};

export default function GuestGuidePage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-muted">
      <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="page-container h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary p-2 rounded-[var(--radius-button)] text-white">
              <PartyPopper className="w-4 h-4" />
            </div>
            <span className="font-semibold text-foreground">EventMaster</span>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-primary flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Accueil
          </Link>
        </div>
      </header>

      <main className="flex-1 page-container py-12">
        <UserGuideView guideId="guest" />
      </main>
    </div>
  );
}
