import Link from 'next/link';
import UserGuideView from '@/components/guide/UserGuideView';
import GuestPortalShell from '@/components/GuestPortalShell';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Aide invité — EventMaster',
  description: 'Guide pour confirmer votre RSVP, consulter votre placement et utiliser le portail invité EventMaster.',
};

export default function GuestGuidePage() {
  return (
    <GuestPortalShell
      showBrand
      title="Aide invité"
      eyebrow="Guide"
      contentClassName="max-w-3xl"
    >
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-primary transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Accueil
        </Link>
      </div>
      <UserGuideView guideId="guest" />
    </GuestPortalShell>
  );
}
