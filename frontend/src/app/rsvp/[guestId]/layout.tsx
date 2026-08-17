import GuestPortalGate from '@/components/GuestPortalGate';
import CelebrateMood from '@/components/CelebrateMood';

export default function GuestRsvpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CelebrateMood />
      <GuestPortalGate>{children}</GuestPortalGate>
    </>
  );
}
