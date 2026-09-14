"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGAL_DOCUMENTS = exports.COLLECTION_COMMISSION_MAX_PERCENT = exports.COLLECTION_COMMISSION_MIN_PERCENT = exports.REFUND_VERSION = exports.PRIVACY_VERSION = exports.TERMS_VERSION = void 0;
exports.collectionCommissionRangeLabel = collectionCommissionRangeLabel;
exports.TERMS_VERSION = '1.7';
exports.PRIVACY_VERSION = '1.7';
exports.REFUND_VERSION = '1.2';
/** Commission plateforme sur le montant global collecté (billets + dons), en plus de l’abonnement. */
exports.COLLECTION_COMMISSION_MIN_PERCENT = 3;
exports.COLLECTION_COMMISSION_MAX_PERCENT = 5;
function collectionCommissionRangeLabel() {
    return `${exports.COLLECTION_COMMISSION_MIN_PERCENT} % à ${exports.COLLECTION_COMMISSION_MAX_PERCENT} %`;
}
exports.LEGAL_DOCUMENTS = {
    TERMS: { type: 'TERMS', version: exports.TERMS_VERSION },
    PRIVACY: { type: 'PRIVACY', version: exports.PRIVACY_VERSION },
};
