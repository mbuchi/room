import { useState } from 'react';
import { Braces, Copy, Check } from 'lucide-react';

/**
 * RawJsonView — a drop-in "raw JSON of the clicked feature" viewer for the
 * parcel/feature info panel, mirroring groove's `{}` developer view.
 *
 * Self-contained (no @aireon/shared dependency) so it can be copied verbatim
 * into any map-first app. Wire it up by:
 *   1. adding a `showRaw` boolean state to the panel,
 *   2. adding a `{}` (Braces) toggle button to the panel header,
 *   3. rendering <RawJsonView value={identifyData} .../> in place of the
 *      normal panel body while `showRaw` is true.
 *
 * Colours match groove's JsonHighlight exactly (keys sky, strings emerald,
 * booleans amber, null red, numbers orange).
 */

interface RawJsonViewProps {
  /** The raw structured data to serialize (usually the geo.admin identify response). */
  value: unknown;
  /** Localized labels; sensible English defaults when omitted. */
  labels?: { title?: string; copy?: string; copied?: string };
  /** Extra classes for the outer flex column. */
  className?: string;
}

const JsonHighlight = ({ value }: { value: unknown }) => {
  const json = JSON.stringify(value, null, 2);
  const tokens = json.split(/("(?:[^"\\]|\\.)*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g);
  return (
    <>
      {tokens.map((token, i) => {
        if (/^"[^"]*"\s*:$/.test(token)) {
          return <span key={i} className="text-sky-400">{token}</span>;
        }
        if (/^"/.test(token)) {
          return <span key={i} className="text-emerald-400">{token}</span>;
        }
        if (/^(true|false)$/.test(token)) {
          return <span key={i} className="text-amber-400">{token}</span>;
        }
        if (/^null$/.test(token)) {
          return <span key={i} className="text-red-400/80">{token}</span>;
        }
        if (/^-?\d/.test(token)) {
          return <span key={i} className="text-orange-300">{token}</span>;
        }
        return <span key={i} className="text-gray-500">{token}</span>;
      })}
    </>
  );
};

export default function RawJsonView({ value, labels, className = '' }: RawJsonViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const title = labels?.title ?? 'Raw JSON';
  const copyLabel = labels?.copy ?? 'Copy';
  const copiedLabel = labels?.copied ?? 'Copied';

  return (
    // flex-1/min-h-0 fills a height-bounded flex column (groove/ParcelPanelShell);
    // max-h-[70vh] guarantees the <pre> still scrolls inside bespoke panels that
    // are not themselves height-bounded flex columns.
    <div className={`flex flex-col flex-1 min-h-0 max-h-[70vh] ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-800/50">
        <div className="flex items-center gap-2">
          <Braces size={11} className="text-amber-500 dark:text-amber-400" />
          <span className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider">{title}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {copied ? (
            <><Check size={11} className="text-emerald-500 dark:text-emerald-400" /><span className="text-emerald-500 dark:text-emerald-400">{copiedLabel}</span></>
          ) : (
            <><Copy size={11} /><span>{copyLabel}</span></>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="text-[11px] leading-relaxed font-mono text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all">
          <JsonHighlight value={value} />
        </pre>
      </div>
    </div>
  );
}
