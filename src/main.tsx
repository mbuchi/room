import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlassProvider, initTheme, applyTheme, initOpenReplay } from '@aireon/shared';
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

errorLogger.install({ captureConsoleErrors: true });
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
        <App />
      </I18nProvider>
    </GlassProvider>
  </StrictMode>
);
