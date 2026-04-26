import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { submitFeedback, type FeedbackCategory } from '@/services/gitlab/feedbackService';

const FONT = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'general', label: 'General' },
];

export function FeedbackModal() {
  const { user } = useAuth();
  const config = useConfigStore((s) => s.config);
  const closeModal = useUiStore((s) => s.closeModal);

  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setPhase('submitting');
    setError(null);

    const result = await submitFeedback(config.gitlab, {
      name: user.name,
      email: user.email,
      category,
      message: message.trim(),
    });

    if (result.ok) {
      setPhase('done');
      useUiStore.getState().addToast({ id: `fb-${Date.now()}`, type: 'success', title: 'Feedback submitted — thank you!' });
      setTimeout(() => closeModal(), 1200);
    } else {
      setPhase('error');
      setError(result.error);
    }
  };

  return (
    <div data-testid="feedback-modal" style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* User info (read-only) */}
      <div style={{ fontSize: '0.85rem', color: '#5A5D5C' }}>
        From: <strong>{user?.name ?? 'Unknown'}</strong> ({user?.email ?? 'no email'})
      </div>

      {/* Category */}
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 4 }}>Category</label>
        <select
          data-testid="feedback-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          style={{ padding: '6px 10px', border: '1px solid #CCCABC', borderRadius: 6, fontSize: '0.85rem', fontFamily: FONT }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 4 }}>Your feedback</label>
        <textarea
          data-testid="feedback-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your feedback..."
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid #CCCABC', borderRadius: 6, fontSize: '0.875rem', fontFamily: FONT, resize: 'vertical' }}
        />
      </div>

      {/* Error */}
      {phase === 'error' && error && (
        <div style={{ fontSize: '0.85rem', color: '#E60000' }}>{error}</div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div style={{ fontSize: '0.85rem', color: '#00A651' }}>Feedback submitted!</div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          onClick={closeModal}
          style={{ padding: '8px 16px', border: '1px solid #CCCABC', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontFamily: FONT }}
        >
          Cancel
        </button>
        <button
          data-testid="feedback-submit"
          onClick={handleSubmit}
          disabled={!message.trim() || phase === 'submitting' || phase === 'done'}
          style={{
            padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: FONT, color: '#fff',
            background: (!message.trim() || phase === 'submitting') ? '#CCCABC' : '#E60000',
          }}
        >
          {phase === 'submitting' ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
