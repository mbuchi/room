import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlassProvider, initTheme, applyTheme, initOpenReplay, installSignalCarrier } from '@aireon/shared';
import { getThemeOverride } from '@aireon/shared/url-params';
import { I18nProvider } from './contexts/I18nContext';
import App from './App.tsx';
import { errorLogger } from './lib/errorLog';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@aireon/shared/map-ui.css';
import '@aireon/shared/scrollbars.css';
import '@aireon/shared/basemap.css';
import '@aireon/shared/glass.css';
import './index.css';
import { CompareProvider } from './contexts/CompareContext';
import '@aireon/shared/fonts.css';

errorLogger.install({ captureConsoleErrors: true });

// Carrier transport for usage signals. Signals are queued in memory instead of
// firing one POST per user action, and whatever is still queued is flushed once
// on pagehide to the neutral /api/ctx collector. Installed AFTER
// errorLogger.install so this wraps the outermost fetch rather than being
// wrapped by the error capture.
//
// Queued signals ride along on the POST /api/parcel-data request the app
// already makes when a parcel is selected - the same interaction that emits the
// signal - so the common flow adds no request of its own. That handler is
// wrapped with `withSignalCarrierWeb` (api/parcel-data.ts) and acknowledges how
// many signals it took; anything unacknowledged goes back on the queue and
// leaves on the page-hide flush to /api/ctx.
//
// Only /api/parcel-data is declared. A path listed here that is NOT wrapped on
// the server would take a batch nothing acknowledges, so the list is explicit
// and never guessed.
//
// This is a transport change: the same data is collected and stored as before.
// It reduces how visible first-party analytics are in the Network tab; it is
// not a privacy or security measure. See
// aireon-shared/docs/SIGNAL_STANDARD.md.
installSignalCarrier({ paths: ['/api/parcel-data'], endpoint: '/api/ctx' });

initOpenReplay({ projectKey: import.meta.env.VITE_OPENREPLAY_PROJECT_KEY as string | undefined, trackerOptions: { canvas: { disableCanvas: true } } });

// room keeps its signature dark look by default, but now ships a light/dark
// toggle. initTheme resolves the cross-app `aireon_theme` cookie (shared by
// every *.aireon.ch app) → localStorage mirror → OS preference → room's dark
// default, and applies the suite-standard `dark` class on <html> before first
// paint (so Tailwind `dark:` variants and the tour's dark detection resolve
// with no flash). MapView owns the toggle and calls setTheme thereafter.
initTheme('dark');

// `?theme=dark|light` (URL_PARAMS_STANDARD.md) wins for this page load only.
// Applied here — before ANY component (including the RoomAccessGate loading
// skeleton, which reads the class synchronously on its own first paint) ever
// mounts — so there is no flash of the stored/default theme. Ephemeral: this
// never touches the cookie/localStorage; only setTheme() (MapView's in-app
// toggle) persists.
const themeOverride = getThemeOverride();
if (themeOverride) applyTheme(themeOverride);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlassProvider>
      <I18nProvider>
        <CompareProvider>
          <App />
        </CompareProvider>
      </I18nProvider>
    </GlassProvider>
  </StrictMode>
);
