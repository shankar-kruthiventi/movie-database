import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { StyledEngineProvider } from '@mui/material/styles';
import './theme.css';
import { ThemeModeProvider } from './theme-mode';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeModeProvider>
        <App />
      </ThemeModeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);

// Remove any stale service worker registered by older (CRA) deployments.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
}
