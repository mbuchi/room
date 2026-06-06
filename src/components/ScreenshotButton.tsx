import { useEffect, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { captureBrowserScreenshot, extensionForBlob } from '../lib/captureScreenshot';
import { uploadImage, type ScreenshotMetadata } from '../services/imageService';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../contexts/I18nContext';

type ToastKind = 'success' | 'error';
interface Toast {
  kind: ToastKind;
  message: string;
  url?: string;
}

interface ScreenshotButtonProps {
  // Caller supplies app-specific context (map center, parcel id, tilt, etc.)
  // that gets merged into custom_metadata at capture time.
  getCaptureMetadata?: () => Promise<ScreenshotMetadata> | ScreenshotMetadata;
}

export default function ScreenshotButton({ getCaptureMetadata }: ScreenshotButtonProps = {}) {
  const { isAuthenticated, promptLogin } = useAuth();
  const { t } = useI18n();
  const [isCapturing, setIsCapturing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleSaveScreenshot = async () => {
    if (!isAuthenticated) {
      // Open the suite sign-in modal instead of redirecting straight to
      // Zitadel — it keeps the user in context and matches the save-parcel CTA.
      promptLogin();
      return;
    }
    setIsCapturing(true);
    // Yield so the overlay paints before the heavy DOM walk starts.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      const blob = await captureBrowserScreenshot();
      const extra = getCaptureMetadata ? await getCaptureMetadata() : {};
      const saved = await uploadImage(blob, {
        filename: `groove-${Date.now()}.${extensionForBlob(blob)}`,
        customMetadata: {
          url: window.location.href,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          captured_at: new Date().toISOString(),
          ...extra,
        },
      });
      setToast({ kind: 'success', message: t('panel.screenshot.image_saved'), url: saved.public_url });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('panel.screenshot.failed');
      if (!/permission denied|NotAllowedError|aborted/i.test(message)) {
        setToast({ kind: 'error', message });
      } else {
        setToast(null);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      <button
        onClick={handleSaveScreenshot}
        disabled={isCapturing}
        title={isAuthenticated ? t('panel.screenshot.save_image') : t('panel.screenshot.sign_in_to_save')}
        aria-label={isAuthenticated ? t('panel.screenshot.save_image') : t('panel.screenshot.sign_in_to_save')}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      >
        {isCapturing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Camera size={16} />
        )}
      </button>

      {isCapturing && (
        <div
          data-screenshot-ignore="true"
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-xl bg-gray-900 border border-gray-700/60 shadow-2xl">
            <Loader2 size={36} className="animate-spin text-red-500" />
            <span className="text-sm font-medium text-gray-200">
              {t('panel.screenshot.creating_image')}
            </span>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[120] max-w-sm rounded-lg shadow-2xl px-4 py-3 text-sm flex items-start gap-3 ${
            toast.kind === 'success'
              ? 'bg-emerald-950/95 border border-emerald-700/70 text-emerald-100'
              : 'bg-red-950/95 border border-red-700/70 text-red-100'
          }`}
          role="status"
        >
          <span className="flex-1">
            {toast.message}
            {toast.url && (
              <a
                href={toast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-1 underline text-xs opacity-90 hover:opacity-100 break-all"
              >
                {t('panel.screenshot.view_image')}
              </a>
            )}
          </span>
          <button
            onClick={() => setToast(null)}
            className="opacity-80 hover:opacity-100"
            aria-label={t('panel.screenshot.dismiss')}
            title={t('panel.screenshot.dismiss')}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
