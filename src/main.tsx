import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { useConfigStore } from '@/stores/configStore';
import { initEpicDraftPersistence } from '@/services/draft/epicDraft';
import './styles/global.css';

// Hydrate persisted settings before first render
useConfigStore.getState().loadFromStorage();

// Restore any unsaved epic draft + start autosave (data-loss guard)
initEpicDraftPersistence();

// DEV-only: route all AI calls through the local Claude headless proxy.
// Gated on VITE_LOCAL_LLM=1 (set in .env.local, never committed). Seeds only the
// AI provider fields + the Azure endpoint; any GitLab token entered in Settings
// is preserved by the deep-merge in updateConfig. Lets you smoke-test every LLM
// call site against your local `claude` (Sonnet) before pointing at the UBS env.
if (import.meta.env.VITE_LOCAL_LLM === '1') {
  useConfigStore.getState().updateConfig({
    endpoints: {
      azureEndpoint: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'http://localhost:8787',
    },
    ai: {
      provider: 'azure',
      azure: {
        deploymentName: 'claude-sonnet',
        apiKey: 'local-proxy',
        model: 'claude-sonnet',
      },
    },
  });
  console.info('[FRAME] VITE_LOCAL_LLM=1 — AI routed through local Claude proxy (provider=azure → %s)',
    import.meta.env.VITE_AZURE_OPENAI_ENDPOINT || 'http://localhost:8787');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
