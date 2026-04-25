/**
 * FederatedApp.tsx — Module Federation entry point.
 *
 * Re-exports App for the federation shell to consume via remoteEntry.js.
 * vite.config.ts exposes './App' → this file.
 */
export { default } from './App';
