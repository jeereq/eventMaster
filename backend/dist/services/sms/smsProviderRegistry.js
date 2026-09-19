"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsRegistry = void 0;
exports.registerSmsProvider = registerSmsProvider;
exports.getSmsProvider = getSmsProvider;
exports.getActiveSmsProvider = getActiveSmsProvider;
exports.listAvailableSmsProviders = listAvailableSmsProviders;
const dreamDigitalProvider_ts_1 = require("./dreamDigitalProvider.js");
const twilioProvider_ts_1 = require("./twilioProvider.js");
const genericHttpSmsProvider_ts_1 = require("./genericHttpSmsProvider.js");
const smsConfig_ts_1 = require("./smsConfig.js");
class SmsProviderRegistry {
    providers = new Map();
    constructor() {
        // Enregistrement des passerelles par défaut
        this.register(new dreamDigitalProvider_ts_1.DreamDigitalSmsProvider());
        this.register(new twilioProvider_ts_1.TwilioSmsProvider());
        this.register(new genericHttpSmsProvider_ts_1.GenericHttpSmsProvider());
    }
    /**
     * Enregistre ou remplace une passerelle SMS.
     * Permet d'étendre facilement le système avec de nouvelles API sans modifier le cœur.
     */
    register(provider) {
        this.providers.set(provider.name.toLowerCase(), provider);
    }
    /**
     * Récupère une passerelle par son identifiant unique.
     */
    get(name) {
        return this.providers.get(name.toLowerCase());
    }
    /**
     * Liste l'ensemble des passerelles enregistrées avec leur état de configuration.
     */
    list() {
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
    getActive() {
        const creds = (0, smsConfig_ts_1.getSmsGatewayCredentials)();
        const preferred = (creds.smsProvider || 'dream-digital').toLowerCase();
        const matched = this.get(preferred);
        if (matched)
            return matched;
        // Repli sur Dream Digital si le nom demandé n'est pas reconnu
        return this.get('dream-digital') || new dreamDigitalProvider_ts_1.DreamDigitalSmsProvider();
    }
}
exports.smsRegistry = new SmsProviderRegistry();
function registerSmsProvider(provider) {
    exports.smsRegistry.register(provider);
}
function getSmsProvider(name) {
    return exports.smsRegistry.get(name);
}
function getActiveSmsProvider() {
    return exports.smsRegistry.getActive();
}
function listAvailableSmsProviders() {
    return exports.smsRegistry.list();
}
