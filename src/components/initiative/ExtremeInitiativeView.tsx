import { useInitiativeStore } from '@/stores/initiativeStore';

export default function ExtremeInitiativeView() {
  const step = useInitiativeStore((s) => s.currentStep);
  return (
    <div
      data-testid="initiative-view"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: 24 }}
    >
      <h2 style={{ margin: 0, fontFamily: "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        Extreme Initiative
      </h2>
      <p style={{ color: 'var(--col-text-secondary, #666)' }}>Wizard step: {step}</p>
    </div>
  );
}
