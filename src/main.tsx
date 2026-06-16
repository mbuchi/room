import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from './contexts/I18nContext';
import App from './App.tsx';
import { errorLogger } from './lib/errorLog';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@aireon/shared/map-ui.css';
import '@aireon/shared/scrollbars.css';
import '@aireon/shared/basemap.css';
import './index.css';

errorLogger.install();

// room keeps its signature dark look by default, but now ships a light/dark
// toggle. Assert the suite-standard `dark` class on <html> before first paint
// (so Tailwind `dark:` variants and the tour's dark detection resolve with no
// flash) unless the user has explicitly saved a light choice. MapView owns the
// toggle and keeps this class + the `theme` key in sync thereafter.
if (localStorage.getItem('theme') !== 'light') {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
