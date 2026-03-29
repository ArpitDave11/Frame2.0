import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { useConfigStore } from '@/stores/configStore';
import './styles/global.css';

// Hydrate persisted settings before first render
useConfigStore.getState().loadFromStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
