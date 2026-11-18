'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FLEXPAY_MOBILE_OPERATORS } from '@/lib/flexPayOperators';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { useMessagingChannels } from '@/hooks/useMessagingChannels';
import { enabledPublicCities } from '@/lib/platformCities';

const CARD_COLOR = '#1f4a33';

function joinFr(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
}

/** Trois cartes sombres dans un bloc teinté : paiement, ancrage local, assistance. */
export default function LandingWhyCards() {
  const { site } = usePlatformSite();
  const messaging = useMessagingChannels();
  const cities = enabledPublicCities(site);
  const channels = [
    messaging.has('WHATSAPP') ? 'WhatsApp' : null,
    messaging.has('SMS') ? 'SMS' : null,
    messaging.has('EMAIL') ? 'e-mail' : null,
  ].filter((c): c is string => Boolean(c));

  const cards = [
    {
      title: 'Payé par Mobile Money',
      text: `${joinFr([...FLEXPAY_MOBILE_OPERATORS, 'Visa', 'Mastercard'])}, via FlexPay. Le forfait Découverte est gratuit, sans carte bancaire.`,
      photo: '/images/landing/photo-invitee-telephone.jpg',
      position: 'center 40%',
      alt: 'Invitée qui regarde son téléphone pendant une fête',
    },
    {
      title: 'Pensé pour la RDC',
      text: [
        'Prix en francs congolais',
        channels.length ? `invitations par ${joinFr(channels)}` : null,
        cities.length ? `salles et prestataires à ${joinFr(cities)}` : null,
      ]
        .filter(Boolean)
        .join(', ') + '.',
      photo: '/images/landing/photo-mariage-likasi.jpg',
      position: 'center 45%',
      alt: 'Décor de mariage : fauteuils, fleurs et table d’honneur des mariés',
    },
    {
      title: 'Une équipe qui répond',
      text: `Par téléphone au ${site.supportPhone} ou par e-mail. ${site.supportHours}.`,
      photo: '/images/landing/photo-anniversaire.jpg',
      position: 'center 35%',
      alt: 'Invités qui célèbrent un anniversaire',
      link: { href: '/contact', label: 'Nous contacter' },
    },
  ];

  return (
    <section className="bg-background py-14 sm:py-20">
      <div className="page-container">
        <div className="rounded-[2rem] bg-sage px-4 py-8 sm:p-10 lg:p-12">
          <h2 data-reveal className="em-landing-heading text-3xl sm:text-4xl text-foreground">
            <span className="font-normal">Pourquoi</span> EventMaster ?
          </h2>
          <ul role="list" className="mt-6 sm:mt-8 grid gap-4 sm:gap-5 md:grid-cols-3">
            {cards.map((card, index) => (
              <li
                key={card.title}
                data-reveal
                style={{ '--i': index, '--bite': CARD_COLOR, backgroundColor: CARD_COLOR } as CSSProperties}
                className="flex flex-col rounded-[1.5rem] p-5 sm:p-7 text-white"
              >
                  <span className="em-bite relative block aspect-[16/10] overflow-hidden">
                    <Image
                      src={card.photo}
                      alt={card.alt}
                      fill
                      sizes="(min-width: 768px) 30vw, 90vw"
                      className="object-cover"
                      style={{ objectPosition: card.position }}
                    />
                  </span>
                  <h3 className="mt-6 sm:mt-8 font-display text-2xl font-normal leading-tight text-white">{card.title}</h3>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/80">{card.text}</p>
                  {card.link ? (
                    <Link
                      href={card.link.href}
                      className="mt-auto pt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[#b0eed5] hover:underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {card.link.label}
                    </Link>
                  ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
