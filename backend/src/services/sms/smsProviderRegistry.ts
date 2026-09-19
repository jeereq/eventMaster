import { DreamDigitalSmsProvider } from './dreamDigitalProvider.ts';
import { TwilioSmsProvider } from './twilioProvider.ts';
import { GenericHttpSmsProvider } from './genericHttpSmsProvider.ts';
import { getSmsGatewayCredentials } from './smsConfig.ts';
import type { SmsProvider } from './types.ts';

class SmsProviderRegistry {
  private providers = new Map<string, SmsProvider>();

  constructor() {
    // Enregistrement des passerelles par défaut
    this.register(new DreamDigitalSmsProvider());
    this.register(new TwilioSmsProvider());
    this.register(new GenericHttpSmsProvider());
  }

  /**
   * Enregistre ou remplace une passerelle SMS.
   * Permet d'étendre facilement le système avec de nouvelles API sans modifier le cœur.
   */
  register(provider: SmsProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  /**
   * Récupère une passerelle par son identifiant unique.
   */
  get(name: string): SmsProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  /**
   * Liste l'ensemble des passerelles enregistrées avec leur état de configuration.
   */
  list(): Array<{ name: string; label: string; configured: boolean }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      label: p.label,
      configured: p.isConfigured(),
    }));
  }

  /**
   * Résout la passerelle active d'après les réglages plateforme ou variables d'environnement.
   * Par défaut : Dream Digital.
   */
  getActive(): SmsProvider {
    const creds = getSmsGatewayCredentials();
    const preferred = (creds.smsProvider || 'dream-digital').toLowerCase();
    const matched = this.get(preferred);
    if (matched) return matched;
    // Repli sur Dream Digital si le nom demandé n'est pas reconnu
    return this.get('dream-digital') || new DreamDigitalSmsProvider();
  }
}

export const smsRegistry = new SmsProviderRegistry();

export function registerSmsProvider(provider: SmsProvider): void {
  smsRegistry.register(provider);
}

export function getSmsProvider(name: string): SmsProvider | undefined {
  return smsRegistry.get(name);
}

export function getActiveSmsProvider(): SmsProvider {
  return smsRegistry.getActive();
}

export function listAvailableSmsProviders() {
  return smsRegistry.list();
}
