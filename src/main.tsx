import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from './contexts/I18nContext';
import { installErrorLogging } from '@aireon/shared';
import App from './App.tsx';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@aireon/shared/map-ui.css';
import '@aireon/shared/basemap.css';
import './index.css';

installErrorLogging({ appName: 'room' });

// room is dark-only: assert the suite-standard `dark` class on <html> before
// first paint so Tailwind `dark:` variants and the tour's dark detection resolve
// correctly. There is no light theme, so this is unconditional (no toggle).
document.documentElement.classList.add('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
