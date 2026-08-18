import { redirect } from 'next/navigation';

function queryString(sp: Record<string, string | string[] | undefined>) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (Array.isArray(value)) value.forEach((item) => qs.append(key, item));
    else if (value) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export default async function PublicEventRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  redirect(`/marketplace/evenements/${slug}${queryString(sp)}`);
}
