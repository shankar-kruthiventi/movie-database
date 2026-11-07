import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import theme from './theme';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);

// Remove any stale service worker registered by older (CRA) deployments.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
}
