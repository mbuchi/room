import { Loader2 } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';
import type { ScreenshotToast } from '../hooks/useScreenshot';

interface ScreenshotFeedbackProps {
  isCapturing: boolean;
  toast: ScreenshotToast | null;
  onDismiss: () => void;
}

/**
 * Presentational capturing-overlay + result-toast for the "Export image" flow.
 * Mounted once by the navbar; driven by {@link useScreenshot}.
 */
export default function ScreenshotFeedback({ isCapturing, toast, onDismiss }: ScreenshotFeedbackProps) {
  const { t } = useI18n();

  return (
    <>
      {isCapturing && (
        <div
          data-screenshot-ignore="true"
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700/60 shadow-2xl">
            <Loader2 size={36} className="animate-spin text-red-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
            onClick={onDismiss}
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
