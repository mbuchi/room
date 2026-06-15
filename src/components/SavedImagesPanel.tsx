import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Trash2, Image as ImageIcon, ExternalLink, Loader2, MapPin, Compass, Hash, Map as MapIcon } from 'lucide-react';
import { Skeleton } from '@aireon/shared';
import {
  listImages,
  deleteImage,
  APP_LABELS,
  type SavedImage,
  type ScreenshotMetadata,
} from '../services/imageService';
import { useI18n } from '../contexts/I18nContext';

const SHOWROOM_URL = 'https://showroom.aireon.ch/';
// Modal is a quick-glance preview; the full catalog lives in the Showroom
// app, reachable via the "See all publications in Showroom" button.
const MAX_VISIBLE_IMAGES = 3;

// Fields rendered explicitly in the preview metadata block. Anything else in
// custom_metadata is shown in a generic "more" list so future flexible fields
// surface without code changes.
const KNOWN_META_KEYS = new Set([
  'url',
  'viewport',
  'captured_at',
  'central_lat',
  'central_lng',
  'central_parcel_id',
  'egrid',
  'tilt_degree',
  'bearing_degree',
  'zoom',
  'address',
  'basemap',
  'is_3d_mode',
]);

const formatCoord = (n: unknown) => (typeof n === 'number' ? n.toFixed(5) : null);
const formatDeg = (n: unknown) =>
  typeof n === 'number' ? `${Math.round(n)}°` : null;

interface SavedImagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SavedImagesPanel({ isOpen, onClose }: SavedImagesPanelProps) {
  const { t, locale } = useI18n();
  const [images, setImages] = useState<SavedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<SavedImage | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      // No app_source filter — list across every app the user has used so
      // screenshots saved in Roofs and other apps appear here too. The APP
      // badge on each card identifies the source app.
      const data = await listImages();
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('panel.images.failed_to_load'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (previewImage) setPreviewImage(null);
      else if (isOpen) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose, previewImage]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('panel.images.delete_confirm'))) return;
    setDeletingId(id);
    try {
      await deleteImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      if (previewImage?.id === id) setPreviewImage(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('panel.images.failed_to_delete'));
    } finally {
      setDeletingId(null);
    }
  };

  const visibleImages = useMemo(
    () => images.slice(0, MAX_VISIBLE_IMAGES),
    [images]
  );
  const hiddenCount = Math.max(0, images.length - visibleImages.length);

  if (!isOpen) return null;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale);
    } catch {
      return iso;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderCardMeta = (meta: ScreenshotMetadata | null) => {
    if (!meta) return null;
    const lat = formatCoord(meta.central_lat);
    const lng = formatCoord(meta.central_lng);
    const tilt = formatDeg(meta.tilt_degree);
    const lines: { icon: JSX.Element; text: string; key: string }[] = [];
    if (meta.address) {
      lines.push({ key: 'addr', icon: <MapPin size={11} />, text: meta.address });
    }
    if (lat && lng) {
      lines.push({ key: 'coord', icon: <MapIcon size={11} />, text: `${lat}, ${lng}` });
    }
    if (meta.central_parcel_id) {
      lines.push({ key: 'parcel', icon: <Hash size={11} />, text: String(meta.central_parcel_id) });
    }
    if (tilt) {
      lines.push({ key: 'tilt', icon: <Compass size={11} />, text: t('panel.images.tilt_prefix', { value: tilt }) });
    }
    if (lines.length === 0) return null;
    return (
      <div className="mt-1 space-y-1">
        {lines.map((l) => (
          <div
            key={l.key}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400"
          >
            <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{l.icon}</span>
            <span className="truncate" title={l.text}>{l.text}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderPreviewMeta = (img: SavedImage) => {
    const meta = img.custom_metadata || {};
    const lat = formatCoord(meta.central_lat);
    const lng = formatCoord(meta.central_lng);
    const tilt = formatDeg(meta.tilt_degree);
    const bearing = formatDeg(meta.bearing_degree);
    const zoom = typeof meta.zoom === 'number' ? meta.zoom.toFixed(1) : null;

    const rows: { label: string; value: string }[] = [
      { label: t('panel.images.meta.app'), value: APP_LABELS[img.app_source] || img.app_source },
      { label: t('panel.images.meta.saved'), value: formatDate(img.created_at) },
      { label: t('panel.images.meta.dimensions'), value: `${img.width}×${img.height}` },
      { label: t('panel.images.meta.size'), value: formatSize(img.file_size) },
    ];
    if (meta.address) rows.push({ label: t('panel.images.meta.address'), value: meta.address });
    if (lat && lng) rows.push({ label: t('panel.images.meta.center'), value: `${lat}, ${lng}` });
    if (meta.central_parcel_id) {
      rows.push({ label: t('panel.images.meta.parcel_id'), value: String(meta.central_parcel_id) });
    }
    if (meta.egrid) {
      rows.push({ label: t('panel.images.meta.egrid'), value: String(meta.egrid) });
    }
    if (tilt) rows.push({ label: t('panel.images.meta.tilt'), value: tilt });
    if (bearing) rows.push({ label: t('panel.images.meta.bearing'), value: bearing });
    if (zoom) rows.push({ label: t('panel.images.meta.zoom'), value: zoom });
    if (meta.basemap) rows.push({ label: t('panel.images.meta.basemap'), value: String(meta.basemap) });
    if (typeof meta.is_3d_mode === 'boolean') {
      rows.push({ label: t('panel.images.meta.3d_mode'), value: meta.is_3d_mode ? t('panel.images.meta.on') : t('panel.images.meta.off') });
    }

    const extras = Object.entries(meta).filter(
      ([k, v]) => !KNOWN_META_KEYS.has(k) && v !== null && v !== undefined && v !== ''
    );

    return (
      <div className="text-xs text-gray-700 dark:text-gray-200 space-y-2">
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.label} className="flex gap-3">
              <span className="w-24 flex-shrink-0 text-gray-400 dark:text-gray-500">{r.label}</span>
              <span className="flex-1 break-words font-medium">{r.value}</span>
            </div>
          ))}
        </div>
        {extras.length > 0 && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('panel.images.additional_metadata')}
            </p>
            {extras.map(([k, v]) => (
              <div key={k} className="flex gap-3">
                <span className="w-24 flex-shrink-0 text-gray-400 dark:text-gray-500 break-all">{k}</span>
                <span className="flex-1 break-words font-medium">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/60 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon size={18} className="text-red-500 flex-shrink-0" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{t('panel.images.title')}</h2>
              {!isLoading && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/15 text-red-600 dark:text-red-300">
                  {images.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <a
                href={SHOWROOM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 transition-colors"
              >
                {t('panel.images.see_all_in_showroom')}
                <ExternalLink size={13} />
              </a>
              <a
                href={SHOWROOM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('panel.images.see_all_in_showroom')}
                title={t('panel.images.see_all_in_showroom')}
                className="sm:hidden p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-300 transition-colors"
              >
                <ExternalLink size={16} />
              </a>
              <button
                onClick={() => load(true)}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-50"
                aria-label={t('panel.images.refresh')}
                title={t('panel.images.refresh')}
              >
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                aria-label={t('panel.images.close')}
                title={t('panel.images.close')}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 dark:border-gray-800/60 overflow-hidden bg-gray-100/80 dark:bg-gray-900/60 flex flex-col"
                  >
                    <Skeleton dark className="w-full aspect-video" radius={0} delay={`${i * 90}ms`} />
                    <div className="p-3 flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <Skeleton dark width={42} height={14} radius={4} delay={`${i * 90}ms`} />
                        <Skeleton dark className="flex-1" height={12} radius={4} delay={`${i * 90}ms`} />
                      </div>
                      <Skeleton dark width={120} height={11} radius={4} delay={`${i * 90}ms`} />
                      <Skeleton dark width={150} height={11} radius={4} delay={`${i * 90}ms`} />
                      <div className="mt-2 flex items-center gap-2">
                        <Skeleton dark className="flex-1" height={28} radius={6} delay={`${i * 90}ms`} />
                        <Skeleton dark width={32} height={28} radius={6} delay={`${i * 90}ms`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-sm text-red-500 dark:text-red-400 mb-3">{error}</p>
                <button
                  onClick={() => load()}
                  className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium"
                >
                  {t('panel.images.try_again')}
                </button>
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-16">
                <ImageIcon size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('panel.images.empty_title')}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('panel.images.empty_hint')}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleImages.map((img) => (
                  <div
                    key={img.id}
                    className="group rounded-xl border border-gray-200 dark:border-gray-800/60 overflow-hidden bg-gray-100/80 dark:bg-gray-900/60 flex flex-col"
                  >
                    <button
                      onClick={() => setPreviewImage(img)}
                      className="relative aspect-video bg-gray-200 dark:bg-gray-950 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                    >
                      <img
                        src={img.public_url}
                        alt={img.original_filename}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                    <div className="p-3 flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-500/15 text-red-600 dark:text-red-300">
                          {APP_LABELS[img.app_source] || img.app_source}
                        </span>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">
                          {img.original_filename}
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{formatDate(img.created_at)}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {img.width}×{img.height} · {formatSize(img.file_size)}
                      </p>
                      {renderCardMeta(img.custom_metadata)}
                      <div className="mt-2 flex items-center gap-2">
                        <a
                          href={img.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-medium text-red-600 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                        >
                          <ExternalLink size={12} />
                          {t('panel.images.open')}
                        </a>
                        <button
                          onClick={() => handleDelete(img.id)}
                          disabled={deletingId === img.id}
                          className="inline-flex items-center justify-center px-2 py-1.5 rounded-md text-red-500 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          aria-label={t('panel.images.delete')}
                          title={t('panel.images.delete')}
                        >
                          {deletingId === img.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
                {hiddenCount > 0 && (
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-xs text-gray-600 dark:text-gray-300 text-center sm:text-left">
                      {t('panel.images.showing_latest', {
                        visible: visibleImages.length,
                        total: images.length,
                      })}{' '}
                      <span className="text-gray-500 dark:text-gray-400">
                        {t(
                          hiddenCount === 1
                            ? 'panel.images.more_in_showroom_one'
                            : 'panel.images.more_in_showroom_other',
                          { count: hiddenCount },
                        )}
                      </span>
                    </p>
                    <a
                      href={SHOWROOM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors flex-shrink-0"
                    >
                      {t('panel.images.see_all_in_showroom')}
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute inset-0 bg-black/85" />
          <div
            className="relative w-full max-w-6xl max-h-[95vh] flex flex-col lg:flex-row gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={t('panel.images.close_preview')}
              title={t('panel.images.close_preview')}
            >
              <X size={16} />
            </button>
            <div className="flex-1 min-w-0 flex items-center justify-center">
              <img
                src={previewImage.public_url}
                alt={previewImage.original_filename}
                className="max-w-full max-h-[80vh] lg:max-h-[90vh] rounded-lg shadow-2xl object-contain"
              />
            </div>
            <div className="w-full lg:w-80 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/60 rounded-lg shadow-xl p-4 overflow-y-auto max-h-[40vh] lg:max-h-[90vh]">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 break-all">
                {previewImage.original_filename}
              </p>
              {renderPreviewMeta(previewImage)}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
