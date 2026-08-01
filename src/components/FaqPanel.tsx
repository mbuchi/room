import { type ReactNode } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { PanelScroll } from './PanelKit';
import { useI18n } from '../contexts/I18nContext';

/**
 * "FAQ" tab — the three standing questions about what room calculates, where
 * its zoning data comes from, and whether the utilisation figure is binding,
 * plus the in-panel entry point to Claire.
 *
 * The Q&A text is mirrored byte-for-byte (EN) into the FAQPage JSON-LD in
 * index.html so the visible content backs the structured data. Changing a
 * question or an answer here means changing it there too.
 *
 * Claire lives here because the FAQ is where a reader arrives with a question
 * the app has not answered — "is this binding?" is exactly the moment to offer
 * a conversation. On desktop Claire also has a floating launcher; the card is
 * shown at every width anyway, because discovering the assistant should not
 * depend on noticing a corner FAB. It is a calm secondary action per the panel
 * actions standard (neutral surface, hairline ring, amber only on the glyph) —
 * a gradient CTA here would out-shout the answers it sits above.
 */
const FaqPanel = ({
  onAskClaire,
  actionsSlot,
}: {
  onAskClaire: () => void;
  /** Primary-actions row; on this tab it never repeats the Ask Claire button. */
  actionsSlot?: ReactNode;
}) => {
  const { t } = useI18n();
  const qas: Array<{ q: string; a: string }> = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
  ];

  return (
    <PanelScroll actionsSlot={actionsSlot}>
      <div className="rounded-lg border border-gray-200 dark:border-gray-800/50 bg-gray-100/80 dark:bg-gray-900/60 p-3">
        <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
          {t('panel.faq.claire_hint')}
        </p>
        <button
          type="button"
          onClick={onAskClaire}
          className="mt-2.5 w-full min-w-0 flex items-center justify-center gap-2 min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200/70 dark:bg-white/[0.05] dark:text-slate-200 dark:ring-white/[0.07] dark:hover:bg-white/[0.08] transition active:scale-[0.99]"
        >
          <Sparkles size={16} aria-hidden="true" className="shrink-0 text-amber-500" />
          <span className="truncate">{t('panel.info.ask_claire')}</span>
        </button>
      </div>

      <div className="space-y-1.5">
        {qas.map(({ q, a }) => (
          <details
            key={q}
            className="group bg-gray-100/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800/50 rounded-lg overflow-hidden"
          >
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-gray-700 dark:text-gray-200 select-none hover:bg-gray-200/50 dark:hover:bg-gray-800/40 transition-colors">
              <span>{q}</span>
              <ChevronDown
                size={13}
                className="flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="px-3 pb-2.5 pt-0.5 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
              {a}
            </p>
          </details>
        ))}
      </div>
    </PanelScroll>
  );
};

export default FaqPanel;
