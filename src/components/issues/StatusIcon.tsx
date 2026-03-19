/**
 * StatusIcon — renders the correct Phosphor icon for a given issue status.
 */

import {
  CheckCircle,
  Pulse,
  Warning,
  Clock,
  Circle,
} from '@phosphor-icons/react';
import { STATUS_CONFIG } from './types';
import type { MockIssue } from './types';

const ICON_MAP = {
  CheckCircle,
  Pulse,
  Warning,
  Clock,
  Circle,
} as const;

interface StatusIconProps {
  status: MockIssue['status'];
  size?: number;
}

export function StatusIcon({ status, size = 14 }: StatusIconProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = ICON_MAP[cfg.iconName];
  return <Icon size={size} weight={cfg.weight} color={cfg.color} />;
}
