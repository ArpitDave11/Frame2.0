---
paths: ["src/components/**", "src/stores/**", "src/hooks/**"]
---
# Frontend Rules
- Use React 19 functional components with hooks.
- State management via Zustand v5 stores — no prop drilling for global state.
- Keep components under 200 lines. Extract sub-components when they grow.
- DO NOT edit src/components/welcome/** — WelcomeScreen is out of scope.
- Modal control via uiStore.openModal(id) with ModalId type.
