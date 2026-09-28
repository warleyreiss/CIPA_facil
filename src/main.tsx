import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ProjetoProvider } from './contexts/ProjetoContext';
import { ToasterProvider } from './components/ui';
import './index.css';
import 'primeicons/primeicons.css';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeflex/primeflex.css';
import './assets/css/app.css';
import { applyThemeModeToDocument, getStoredThemeMode } from './lib/themeStorage';
import { ensureAdsReadyFromStorage } from './lib/adsenseConsent';

applyThemeModeToDocument(getStoredThemeMode());
ensureAdsReadyFromStorage();
/**
 * CONFIGURAÇÃO DO ROOT (PONTO DE ENTRADA)
 * ProjetoProvider no root evita dessincronizar Context no Fast Refresh
 * (tela branca: useProjeto fora do Provider).
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProjetoProvider>
        <ToasterProvider>
          <App />
        </ToasterProvider>
      </ProjetoProvider>
    </BrowserRouter>
  </React.StrictMode>
);
