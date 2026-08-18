'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import PublicPageShell, { PublicPageHero } from '@/components/PublicPageShell';
import { Alert, Button, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { Calendar, MapPin, Ticket, Play, Rss } from 'lucide-react';
import { cn } from '@/lib/cn';
import { isVideoUrl, mediaPosterUrl, type PublicEventCard, type PublicEventPost } from '@/lib/marketplace';

function EventMediaGallery({ photos }: { photos: string[] }) {
  const [index, setIndex] = useState(0);
  const current = photos[index];
  if (!photos.length) return null;
  return (
    <div className="space-y-3">
      <div className="aspect-[16/9] rounded-[var(--radius-card)] overflow-hidden bg-black/80 border border-border">
        {current && isVideoUrl(current) ? (
          <video
            key={current}
            src={current}
            poster={mediaPosterUrl(current)}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        ) : current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="" className="w-full h-full object-cover" />
        ) : null}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'relative shrink-0 w-[4.75rem] aspect-[4/3] rounded-lg overflow-hidden border bg-surface-muted',
                i === index ? 'border-primary ring-2 ring-primary/30' : 'border-border',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaPosterUrl(url)} alt="" className="w-full h-full object-cover" />
              {isVideoUrl(url) && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PublicFeedPost({ post }: { post: PublicEventPost }) {
  return (
    <article className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {new Date(post.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
      {post.content && <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{post.content}</p>}
      {post.media.length > 0 && (
        <div className={cn('grid gap-1 rounded-[var(--radius-button)] overflow-hidden', post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {post.media.map((media) =>
            media.type === 'VIDEO' ? (
              <video key={media.url} src={media.url} controls className="w-full max-h-72 object-contain bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={media.url} src={media.url} alt="" className="w-full max-h-72 object-cover" />
            ),
          )}
        </div>
      )}
    </article>
  );
}

function PublicEventDetailInner() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();
  const { user, token, loading: authLoading } = useAuth();
  const slug = params.slug as string;
  const [event, setEvent] = useState<PublicEventCard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [guestCheckout, setGuestCheckout] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);

  const nextPath = `/evenements/${slug}`;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const registerHref = `/register?kind=CLIENT&next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.get(`/public/events/${slug}`);
        if (!cancelled) setEvent(data.event);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Événement introuvable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    setBuyerName((prev) => prev || user.name || '');
    setBuyerEmail((prev) => prev || user.email || '');
    setBuyerPhone((prev) => prev || user.phone || '');
    setGuestCheckout(false);
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    setBusy(true);
    setError('');
    try {
      const data = await api.post(`/public/events/${slug}/checkout`, {
        buyerName,
        buyerEmail,
        buyerPhone,
        quantity,
      });
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      const rsvp = data.rsvpUrl ? `&rsvp=${encodeURIComponent(data.rsvpUrl)}` : '';
      router.push(`/evenements/${slug}/succes?order=${data.orderId || ''}${rsvp}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  };

  const showAuthChoice = !authLoading && !token && !guestCheckout;
  const photos = event?.photos?.filter(Boolean) || [];
  const posts = event?.posts || [];

  return (
    <PublicPageShell>
      {loading ? (
        <div className="page-container py-16 text-sm text-muted">Chargement…</div>
      ) : !event ? (
        <div className="page-container py-16 space-y-3">
          <Alert variant="error">{error || 'Événement introuvable ou privé.'}</Alert>
          <Link href="/evenements" className="text-sm font-semibold text-primary">Retour à l’agenda</Link>
        </div>
      ) : (
        <>
          <PublicPageHero
            chip={event.orgName}
            title={event.title}
            description={event.description || undefined}
            compact
          >
            <div className="flex flex-wrap gap-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.location}
              </span>
            </div>
          </PublicPageHero>
          <section className="page-container py-10 grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-6">
              {photos.length > 0 && <EventMediaGallery photos={photos} />}
              <div className="space-y-3 text-sm text-muted leading-relaxed">
                {event.description ? <p className="whitespace-pre-line">{event.description}</p> : <p>Inscription ouverte au public.</p>}
                <p>
                  {event.paid
                    ? `Billet : ${formatFc(event.ticketPriceFc)} · paiement en ligne (carte).`
                    : 'Entrée libre : inscrivez-vous pour recevoir votre badge QR.'}
                </p>
                {event.ticketsRemaining != null && (
                  <p>{event.soldOut ? 'Complet.' : `${event.ticketsRemaining} place${event.ticketsRemaining > 1 ? 's' : ''} restante${event.ticketsRemaining > 1 ? 's' : ''}.`}</p>
                )}
              </div>
              {posts.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-semibold text-foreground inline-flex items-center gap-2">
                    <Rss className="w-4 h-4" />
                    Actualités
                  </h2>
                  {posts.map((post) => (
                    <PublicFeedPost key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
            <div className="lg:col-span-2">
              <form onSubmit={submit} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
                <h2 className="font-semibold text-foreground inline-flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  {event.paid ? 'Acheter un billet' : 'S’inscrire'}
                </h2>
                {search.get('canceled') && (
                  <Alert variant="error">Paiement annulé. Vous pouvez réessayer.</Alert>
                )}
                {error && <Alert variant="error">{error}</Alert>}
                {event.soldOut ? (
                  <p className="text-sm text-muted">Plus de places disponibles.</p>
                ) : showAuthChoice ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted leading-relaxed">
                      Connectez-vous pour retrouver vos billets dans le tableau de bord, ou continuez en invité.
                    </p>
                    <Link href={loginHref} className="block">
                      <Button type="button" fullWidth>Se connecter</Button>
                    </Link>
                    <Link href={registerHref} className="block">
                      <Button type="button" variant="secondary" fullWidth>Créer un compte client</Button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setGuestCheckout(true)}
                      className="w-full text-sm font-semibold text-primary hover:underline py-1"
                    >
                      Continuer en invité
                    </button>
                  </div>
                ) : (
                  <>
                    {token && user && (
                      <p className="text-xs text-muted">
                        Connecté en tant que {user.name || user.email}. Les billets apparaîtront dans{' '}
                        <Link href="/dashboard/tickets" className="font-semibold text-primary hover:underline">Mes billets</Link>.
                      </p>
                    )}
                    {!token && (
                      <p className="text-xs text-muted">
                        Inscription invité.{' '}
                        <Link href={loginHref} className="font-semibold text-primary hover:underline">Se connecter</Link>
                        {' · '}
                        <Link href={registerHref} className="font-semibold text-primary hover:underline">Créer un compte</Link>
                      </p>
                    )}
                    <Input label="Nom complet" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} required />
                    <Input label="E-mail" type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} required />
                    <Input label="Téléphone (optionnel)" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
                    <Input
                      label="Nombre de places"
                      type="number"
                      min={1}
                      max={8}
                      value={String(quantity)}
                      onChange={(e) => setQuantity(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
                    />
                    {event.paid && (
                      <p className="text-sm font-semibold">
                        Total : {formatFc(event.ticketPriceFc * quantity)}
                      </p>
                    )}
                    <Button type="submit" loading={busy} fullWidth>
                      {event.paid ? 'Payer et réserver' : 'Confirmer l’inscription'}
                    </Button>
                  </>
                )}
              </form>
            </div>
          </section>
        </>
      )}
    </PublicPageShell>
  );
}

export default function PublicEventDetailPage() {
  return (
    <Suspense fallback={<div className="page-container py-16 text-sm text-muted">Chargement…</div>}>
      <PublicEventDetailInner />
    </Suspense>
  );
}
