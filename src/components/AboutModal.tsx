import { useEffect } from 'react';
import { CloseButton } from '@aireon/shared';
import { useI18n } from '../contexts/I18nContext';

interface AboutModalProps {
  glassLevel: number;
  onClose: () => void;
}

export default function AboutModal({ glassLevel, onClose }: AboutModalProps) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const surface =
    glassLevel > 0
      ? 'glass-surface text-gray-900 dark:text-gray-100'
      : 'bg-white dark:bg-[#1a1f2e] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-white/10';

  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        className={`relative ${surface} rounded-2xl shadow-2xl w-full max-w-sm p-6`}
      >
        <CloseButton
          onClick={onClose}
          label={t('about.close')}
          size="lg"
          className="absolute top-3 right-3"
        />
        <h2 id="about-modal-title" className="text-lg font-semibold mb-1">
          r<span className="text-red-600">oo</span>m
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t('about.description')}</p>
        <div className="border-t border-gray-200/60 dark:border-white/10 pt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>
            {t('about.mapData')}:{' '}
            <a href="https://www.swisstopo.admin.ch" target="_blank" rel="noreferrer" className="underline hover:text-gray-700 dark:hover:text-gray-200">© swisstopo</a>
          </p>
          <p>
            {t('about.renderer')}:{' '}
            <a href="https://maplibre.org" target="_blank" rel="noreferrer" className="underline hover:text-gray-700 dark:hover:text-gray-200">MapLibre GL</a>
          </p>
        </div>
      </div>
    </div>
  );
}
