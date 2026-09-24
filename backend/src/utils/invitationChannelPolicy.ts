import { loadPlatformSettings } from '../services/platformSettingsService';
import {
  authorizedDeliveryChannels,
  clampInvitationChannel,
  invitationMethodsFromPlatform,
  type DeliveryChannel,
} from './notificationChannels';

export function allowedPlatformInvitationMethods(): DeliveryChannel[] {
  return invitationMethodsFromPlatform(loadPlatformSettings().notificationChannels);
}

export function resolvePlatformDeliveryChannels(
  channel: string | string[] | null | undefined,
): DeliveryChannel[] {
  return authorizedDeliveryChannels(channel, allowedPlatformInvitationMethods());
}

export function clampInvitationChannelToPlatform(
  channel: string | null | undefined,
): string | null {
  return clampInvitationChannel(channel, allowedPlatformInvitationMethods());
}
