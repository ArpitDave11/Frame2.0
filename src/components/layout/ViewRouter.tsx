/**
 * View router — switches workspace content based on active tab.
 * Each view is a placeholder until its phase is implemented.
 */

import { useUiStore } from '@/stores/uiStore';
import { PlaceholderView } from '@/components/layout/PlaceholderView';

export function ViewRouter() {
  const activeTab = useUiStore((s) => s.activeTab);

  switch (activeTab) {
    case 'planner':
      return <PlaceholderView name="Planner" />;
    case 'issues':
      return <PlaceholderView name="Issue Manager" />;
    case 'blueprint':
      return <PlaceholderView name="Blueprint" />;
    case 'analytics':
      return <PlaceholderView name="Analytics" />;
    default:
      return <PlaceholderView name="Unknown View" />;
  }
}
