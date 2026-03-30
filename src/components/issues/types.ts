/**
 * Issue Manager — shared types and mock data.
 */

export interface TimelineEntry {
  type: 'status' | 'comment' | 'ai';
  author: string;
  action: string;
  time: string;
  content?: string;
}

export interface MockIssue {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'blocked' | 'done';
  priority: 'high' | 'medium' | 'low';
  updated: string;
  assignee: string;
  description?: string;
  timeline?: TimelineEntry[];
  web_url?: string;
  project_id?: number;
  iid?: number;
  due_date?: string | null;
  time_estimate?: number;
  time_spent?: number;
  notes_count?: number;
  weight?: number | null;
  epic_iid?: number | null;
  epic_group_id?: number | null;
}

export const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export const STATUS_CONFIG: Record<
  MockIssue['status'],
  { color: string; bg: string; label: string; weight: 'fill' | 'duotone' | 'regular'; iconName: 'CheckCircle' | 'Pulse' | 'Warning' | 'Clock' | 'Circle' }
> = {
  done:          { color: '#059669', bg: '#ecfdf5', label: 'Done',        weight: 'fill',    iconName: 'CheckCircle' },
  'in-progress': { color: 'var(--col-background-brand)', bg: '#fef2f2', label: 'In Progress', weight: 'duotone', iconName: 'Pulse' },
  blocked:       { color: '#f59e0b', bg: '#fffbeb', label: 'Blocked',     weight: 'fill',    iconName: 'Warning' },
  review:        { color: '#6366f1', bg: '#eef2ff', label: 'In Review',   weight: 'regular',  iconName: 'Clock' },
  todo:          { color: 'var(--col-text-subtle)', bg: '#f9fafb', label: 'To Do', weight: 'regular', iconName: 'Circle' },
};

export function getPriorityColor(priority: MockIssue['priority']): string {
  switch (priority) {
    case 'high':   return 'var(--col-background-brand)';
    case 'medium': return '#f59e0b';
    case 'low':    return 'var(--col-text-subtle)';
  }
}

export function getPriorityLabel(priority: MockIssue['priority']): string {
  switch (priority) {
    case 'high':   return 'High';
    case 'medium': return 'Medium';
    case 'low':    return 'Low';
  }
}

export const MOCK_ISSUES: MockIssue[] = [
  {
    id: 'AUTH-101',
    title: 'Implement OAuth2 PKCE flow for mobile clients',
    status: 'in-progress',
    priority: 'high',
    updated: '2h ago',
    assignee: 'Sarah Kim',
    description:
      'Implement OAuth2 with PKCE extension for enhanced security in mobile applications. The implementation must support both iOS and Android native clients with proper token storage and refresh mechanisms.',
    timeline: [
      {
        type: 'ai',
        author: 'AI Assistant',
        action: 'generated update',
        time: '2h ago',
        content:
          'Completed PKCE token exchange implementation. Updated auth flow to use SHA256 code challenge method.',
      },
      {
        type: 'status',
        author: 'Sarah Kim',
        action: 'changed status to In Progress',
        time: '4h ago',
      },
      {
        type: 'comment',
        author: 'Alex Chen',
        action: 'commented',
        time: '1d ago',
        content: 'Make sure to test with both iOS and Android clients.',
      },
    ],
  },
  {
    id: 'AUTH-102',
    title: 'Add refresh token rotation mechanism',
    status: 'review',
    priority: 'high',
    updated: '5h ago',
    assignee: 'Alex Chen',
  },
  {
    id: 'AUTH-103',
    title: 'Implement session timeout handling',
    status: 'blocked',
    priority: 'medium',
    updated: '1d ago',
    assignee: 'Maria Rodriguez',
  },
  {
    id: 'AUTH-104',
    title: 'Add biometric authentication support',
    status: 'in-progress',
    priority: 'medium',
    updated: '6h ago',
    assignee: 'Sarah Kim',
  },
  {
    id: 'AUTH-105',
    title: 'Create auth documentation and examples',
    status: 'done',
    priority: 'low',
    updated: '2d ago',
    assignee: 'John Doe',
  },
  {
    id: 'AUTH-106',
    title: 'Setup authentication monitoring alerts',
    status: 'todo',
    priority: 'low',
    updated: '3d ago',
    assignee: 'Maria Rodriguez',
  },
];
