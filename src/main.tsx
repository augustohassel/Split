import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Forzar actualización inmediata del Service Worker en celulares al publicar nuevas versiones
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  const checkSwUpdate = () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        for (const reg of regs) {
          void reg.update();
        }
      })
      .catch(() => {
        // Ignorar en entornos sin soporte de SW
      });
  };

  window.addEventListener('load', checkSwUpdate);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSwUpdate();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
