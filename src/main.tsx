import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registro do Service Worker para suporte a PWA (Progressive Web App)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Top Food PWA: Service Worker registrado com escopo:', registration.scope);
      })
      .catch((error) => {
        console.warn('Top Food PWA: Falha no registro do Service Worker:', error);
      });
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }
}

// Previne zoom por gesto de pinça no Safari iOS
if (typeof document !== 'undefined') {
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

