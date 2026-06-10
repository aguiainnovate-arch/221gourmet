import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Loader2, QrCode } from 'lucide-react';
import { copyToClipboard } from '../../utils/copyToClipboard';

interface Props {
  totalLabel: string;
  imageUrlPng?: string;
  copyPaste?: string;
  hostedInstructionsUrl?: string;
  loadingCode?: boolean;
  accentColor?: string;
}

export default function PixWaitStep({
  totalLabel,
  imageUrlPng,
  copyPaste,
  hostedInstructionsUrl,
  loadingCode = false,
  accentColor = '#E91120',
}: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyPaste?.trim()) return;
    const ok = await copyToClipboard(copyPaste);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div
        className="rounded-2xl border p-4 text-center"
        style={{ borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }}
      >
        <div className="flex items-center justify-center gap-2 text-emerald-800 mb-1">
          <QrCode className="w-5 h-5" />
          <span className="font-semibold">{t('delivery.stripePixWaitTitle')}</span>
        </div>
        <p className="text-2xl font-bold tabular-nums" style={{ color: accentColor }}>
          {totalLabel}
        </p>
        <p className="text-sm text-emerald-900/80 mt-2 leading-relaxed">
          {t('delivery.stripePixScan')}
        </p>
      </div>

      {imageUrlPng ? (
        <div className="flex justify-center">
          <img
            src={imageUrlPng}
            alt="PIX QR"
            className="max-w-[220px] w-full h-auto rounded-xl border border-gray-200 bg-white p-2"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t('delivery.stripePixCopy')}
        </p>

        {loadingCode && !copyPaste ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('delivery.stripePixLoadingCode')}
          </div>
        ) : copyPaste ? (
          <>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 max-h-28 overflow-y-auto">
              <p className="text-xs text-gray-800 break-all font-mono leading-relaxed select-all">
                {copyPaste}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
              style={{ backgroundColor: accentColor }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('delivery.stripePixCopied') : t('delivery.stripePixCopyButton')}
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-2">{t('delivery.stripePixCodePending')}</p>
        )}
      </div>

      {hostedInstructionsUrl ? (
        <a
          href={hostedInstructionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm text-amber-700 underline"
        >
          {t('delivery.stripePixHostedLink')}
        </a>
      ) : null}

      <div className="flex items-center justify-center gap-2 text-xs text-gray-500 pt-1">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        <span>{t('delivery.stripePixPolling')}</span>
      </div>
    </div>
  );
}
