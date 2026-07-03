import Link from 'next/link';
import UserGuideView from '@/components/guide/UserGuideView';
import { PartyPopper, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Aide invité — EventMaster',
  description: 'Guide pour confirmer votre RSVP, consulter votre placement et utiliser le portail invité EventMaster.',
};

export default function GuestGuidePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-10/12 max-w-3xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <PartyPopper className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">EventMaster</span>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Accueil
          </Link>
        </div>
      </header>

      <main className="flex-1 w-10/12 max-w-3xl mx-auto py-12">
        <UserGuideView guideId="guest" />
      </main>
    </div>
  );
}
