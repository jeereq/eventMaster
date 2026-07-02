import GuestPortalGate from '@/components/GuestPortalGate';

export default function GuestRsvpLayout({ children }: { children: React.ReactNode }) {
  return <GuestPortalGate>{children}</GuestPortalGate>;
}
