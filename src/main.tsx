import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GlassProvider, initTheme } from '@aireon/shared';
import { I18nProvider } from './contexts/I18nContext';
import App from './App.tsx';
import { errorLogger } from './lib/errorLog';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@aireon/shared/map-ui.css';
import '@aireon/shared/scrollbars.css';
import '@aireon/shared/basemap.css';
import '@aireon/shared/glass.css';
import './index.css';

errorLogger.install();

// room keeps its signature dark look by default, but now ships a light/dark
// toggle. initTheme resolves the cross-app `aireon_theme` cookie (shared by
// every *.aireon.ch app) → localStorage mirror → OS preference → room's dark
// default, and applies the suite-standard `dark` class on <html> before first
// paint (so Tailwind `dark:` variants and the tour's dark detection resolve
// with no flash). MapView owns the toggle and calls setTheme thereafter.
initTheme('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlassProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </GlassProvider>
  </StrictMode>
);
