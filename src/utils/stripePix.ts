import type { PaymentIntent } from '@stripe/stripe-js';

export interface StripePixDisplayDetails {
  imageUrlPng?: string;
  copyPaste?: string;
  hostedInstructionsUrl?: string;
}

export function extractPixDetailsFromPaymentIntent(
  pi: PaymentIntent | null | undefined
): StripePixDisplayDetails | null {
  if (!pi) return null;

  const na = pi.next_action as
    | {
        type?: string;
        pix_display_qr_code?: {
          image_url_png?: string;
          data?: string;
          hosted_instructions_url?: string;
        };
      }
    | null
    | undefined;

  if (na?.type === 'pix_display_qr_code' && na.pix_display_qr_code) {
    const p = na.pix_display_qr_code;
    return {
      imageUrlPng: p.image_url_png ?? undefined,
      copyPaste: p.data ?? undefined,
      hostedInstructionsUrl: p.hosted_instructions_url ?? undefined,
    };
  }

  const pm = pi.payment_method;
  if (pm && typeof pm === 'object' && 'pix' in pm) {
    const pix = (pm as { pix?: { bank_code?: string } }).pix;
    if (pix && typeof pix === 'object') {
      return {};
    }
  }

  return null;
}
