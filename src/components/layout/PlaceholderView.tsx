/**
 * Placeholder component for views not yet built.
 * Replaced in later phases as each feature is implemented.
 */

export function PlaceholderView({ name }: { name: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        fontSize: 14,
      }}
    >
      {name} — coming soon
    </div>
  );
}
