import { redirect } from 'next/navigation';

export default function PublicEventsRedirectPage() {
  redirect('/marketplace/evenements');
}
