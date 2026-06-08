import { useEffect, useState } from 'react';
import { captureBrowserScreenshot, extensionForBlob } from '../lib/captureScreenshot';
import { uploadImage, type ScreenshotMetadata } from '../services/imageService';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../contexts/I18nContext';

type ToastKind = 'success' | 'error';
export interface ScreenshotToast {
  kind: ToastKind;
  message: string;
  url?: string;
}

/**
 * Headless "export image" capture flow, lifted out of the old ScreenshotButton
 * so it can be triggered from a user-dropdown menu item (variant-2 navbar). The
 * capturing overlay + result toast are rendered by {@link ScreenshotFeedback}.
 */
export function useScreenshot(
  getCaptureMetadata?: () => Promise<ScreenshotMetadata> | ScreenshotMetadata,
) {
  const { isAuthenticated, promptLogin } = useAuth();
  const { t } = useI18n();
  const [isCapturing, setIsCapturing] = useState(false);
  const [toast, setToast] = useState<ScreenshotToast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const capture = async () => {
    if (!isAuthenticated) {
      // Open the suite sign-in modal instead of redirecting straight to Zitadel
      // — it keeps the user in context and matches the save-parcel CTA.
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
        filename: `room-${Date.now()}.${extensionForBlob(blob)}`,
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

  return {
    capture,
    isCapturing,
    toast,
    dismissToast: () => setToast(null),
    isAuthenticated,
  };
}
