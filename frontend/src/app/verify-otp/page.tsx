'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Mail, MessageSquare, RefreshCw } from 'lucide-react';
import { AuthSplitLayout, MethodToggle } from '@/components/AuthSplitLayout';
import { Button, Alert, Card } from '@/components/ui';

function VerifyOtpForm() {
 const searchParams = useSearchParams();
 const { verifyOtp, resendOtp } = useAuth();

 const initialEmail = searchParams.get('email') || '';
 const initialMethod = (searchParams.get('method') as 'EMAIL' | 'WHATSAPP') || 'EMAIL';
 const fromLogin = searchParams.get('from') === 'login';

 const [email] = useState(initialEmail);
 const [verificationMethod, setVerificationMethod] = useState<'EMAIL' | 'WHATSAPP'>(initialMethod);
 const [digits, setDigits] = useState(['', '', '', '', '', '']);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const [loading, setLoading] = useState(false);
 const [resending, setResending] = useState(false);
 const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

 useEffect(() => {
 if (email) inputRefs.current[0]?.focus();
 }, [email]);

 const otpValue = digits.join('');

 const handleDigitChange = (index: number, value: string) => {
 const digit = value.replace(/\D/g, '').slice(-1);
 const next = [...digits];
 next[index] = digit;
 setDigits(next);
 if (digit && index < 5) inputRefs.current[index + 1]?.focus();
 };

 const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key === 'Backspace' && !digits[index] && index > 0) {
 inputRefs.current[index - 1]?.focus();
 }
 };

 const handlePaste = (e: React.ClipboardEvent) => {
 e.preventDefault();
 const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
 if (!pasted) return;
 const next = [...digits];
 for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
 setDigits(next);
 inputRefs.current[Math.min(pasted.length, 5)]?.focus();
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!email) {
 setError('Adresse e-mail manquante. Connectez-vous pour accéder à la validation OTP.');
 return;
 }
 if (otpValue.length !== 6) {
 setError('Saisissez les 6 chiffres du code OTP.');
 return;
 }
 setError('');
 setLoading(true);
 try {
 await verifyOtp(email, otpValue, { next: searchParams.get('next') });
 } catch (err: unknown) {
 setError(err instanceof Error ? err.message : 'Code invalide.');
 } finally {
 setLoading(false);
 }
 };

 const handleResend = async () => {
 if (!email) return;
 setResending(true);
 setError('');
 setSuccess('');
 try {
 const msg = await resendOtp(email, verificationMethod);
 setSuccess(msg);
 setDigits(['', '', '', '', '', '']);
 inputRefs.current[0]?.focus();
 } catch (err: unknown) {
 setError(err instanceof Error ? err.message : 'Impossible de renvoyer le code.');
 } finally {
 setResending(false);
 }
 };

 if (!email) {
 return (
 <div className="min-h-screen flex items-center justify-center p-6 bg-surface-muted dark:bg-background">
 <Card padding="lg" className="max-w-md w-full text-center space-y-4">
 <Alert variant="error">Aucune adresse e-mail fournie.</Alert>
 <div className="flex flex-col gap-2 text-sm">
 <Link href="/login" className="text-primary font-semibold hover:underline">
 Se connecter pour valider mon compte
 </Link>
 <Link href="/register" className="text-muted hover:underline">
 Créer un nouveau compte organisation
 </Link>
 </div>
 </Card>
 </div>
 );
 }

 return (
 <AuthSplitLayout
 title="Confirmez votre identité"
 description={
 fromLogin
 ? 'Votre organisation vous a créé un compte. Saisissez le code reçu pour activer votre accès.'
 : 'Un code à 6 chiffres vous a été envoyé pour sécuriser votre compte EventMaster.'
 }
 backHref={fromLogin ? '/login' : '/register'}
 backLabel={fromLogin ? 'Retour à la connexion' : "Retour à l'inscription"}
 >
 <Card padding="lg" className="border-border shadow-sm">
 <div className="text-center space-y-2 mb-6">
 <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary">
 {verificationMethod === 'WHATSAPP' ? <MessageSquare className="w-8 h-8" /> : <Mail className="w-8 h-8" />}
 </div>
 <h1 className="text-xl font-bold text-foreground dark:text-foreground">Validez votre compte</h1>
 <p className="text-sm text-muted">
 Code envoyé {verificationMethod === 'WHATSAPP' ? 'sur WhatsApp' : 'par e-mail'} à{' '}
 <span className="font-semibold text-foreground dark:text-foreground">{email}</span>
 </p>
 </div>

 {error && <Alert variant="error" className="mb-4">{error}</Alert>}
 {success && <Alert variant="success" className="mb-4">{success}</Alert>}

 <form onSubmit={handleSubmit} className="space-y-6">
 <div className="flex justify-center gap-2" onPaste={handlePaste}>
 {digits.map((d, i) => (
 <input
 key={i}
 ref={(el) => { inputRefs.current[i] = el; }}
 type="text"
 inputMode="numeric"
 maxLength={1}
 value={d}
 onChange={(e) => handleDigitChange(i, e.target.value)}
 onKeyDown={(e) => handleKeyDown(i, e)}
 className="w-11 h-14 text-center text-xl font-bold border-2 border-border rounded-[var(--radius-button)] focus:border-primary focus:ring-2 focus:ring-primary/20 bg-surface-muted transition"
 aria-label={`Chiffre ${i + 1}`}
 />
 ))}
 </div>

 <Button type="submit" fullWidth size="lg" loading={loading} disabled={otpValue.length !== 6}>
 Valider mon compte
 </Button>
 </form>

 <div className="mt-6 pt-5 border-t border-border-subtle dark:border-border space-y-4">
 <p className="text-xs text-muted text-center">Code expiré ou non reçu ?</p>
 <MethodToggle
 value={verificationMethod}
 onChange={setVerificationMethod}
 options={[
 { value: 'EMAIL' as const, label: 'E-mail', icon: <Mail className="w-3.5 h-3.5" /> },
 { value: 'WHATSAPP' as const, label: 'WhatsApp', icon: <MessageSquare className="w-3.5 h-3.5" /> },
 ]}
 />
 <div className="text-center">
 <Button variant="ghost" size="sm" onClick={handleResend} loading={resending} leftIcon={!resending ? <RefreshCw className="w-3.5 h-3.5" /> : undefined}>
 Renvoyer le code
 </Button>
 </div>
 </div>

 <p className="text-center text-xs text-muted mt-4">
 Déjà validé ?{' '}
 <Link href="/login" className="text-primary font-semibold hover:underline">Se connecter</Link>
 </p>
 </Card>
 </AuthSplitLayout>
 );
}

export default function VerifyOtpPage() {
 return (
 <Suspense fallback={
 <div className="min-h-screen flex items-center justify-center bg-surface-muted dark:bg-background">
 <Loader2 className="w-8 h-8 animate-spin text-primary" />
 </div>
 }>
 <VerifyOtpForm />
 </Suspense>
 );
}
