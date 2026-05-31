import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from './contexts/I18nContext';
import { installErrorLogging } from '@swissnovo/shared';
import App from './App.tsx';
import './index.css';

installErrorLogging({ appName: 'room' });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
