/**
 * IssueDetail — Right panel showing the selected issue details.
 * Shows real GitLab comments when viewing a real issue, mock timeline otherwise.
 */

import { useState, useEffect, useCallback } from 'react';
import { Sparkle, User, Clock, Tag, Pulse, PaperPlaneTilt } from '@phosphor-icons/react';
import { IssueTimeline } from './IssueTimeline';
import { StatusIcon } from './StatusIcon';
import { F, STATUS_CONFIG, getPriorityColor, getPriorityLabel } from './types';
import type { MockIssue, TimelineEntry } from './types';
import { useConfigStore } from '@/stores/configStore';
import { fetchIssueNotes, addIssueNote } from '@/services/gitlab/gitlabClient';
import type { GitLabNote } from '@/services/gitlab/types';

interface IssueDetailProps {
  issue: MockIssue | null;
}

export function IssueDetail({ issue }: IssueDetailProps) {
  const [aiInput, setAiInput] = useState('');
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [aiPreviewText, setAiPreviewText] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [realNotes, setRealNotes] = useState<GitLabNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  const gitlabConfig = useConfigStore((s) => s.config.gitlab);
  const isRealIssue = !!issue?.web_url && !!issue?.project_id && !!issue?.iid;

  // Fetch real notes when a real GitLab issue is selected
  useEffect(() => {
    if (!isRealIssue || !issue?.project_id || !issue?.iid) {
      setRealNotes([]);
      return;
    }

    let cancelled = false;
    setLoadingNotes(true);

    fetchIssueNotes(gitlabConfig, issue.project_id, issue.iid).then((result) => {
      if (cancelled) return;
      setLoadingNotes(false);
      if (result.success && result.data) {
        setRealNotes(result.data);
      }
    });

    return () => { cancelled = true; };
  }, [isRealIssue, issue?.project_id, issue?.iid, gitlabConfig]);

  const handleAddComment = useCallback(async () => {
    if (!commentInput.trim() || !issue?.project_id || !issue?.iid) return;

    setPostingComment(true);
    const result = await addIssueNote(gitlabConfig, issue.project_id, issue.iid, commentInput.trim());
    setPostingComment(false);

    if (result.success && result.data) {
      setRealNotes((prev) => [...prev, result.data!]);
      setCommentInput('');
    }
  }, [commentInput, issue?.project_id, issue?.iid, gitlabConfig]);

  const handleGenerateAI = () => {
    if (!aiInput.trim()) return;
    setAiPreviewText(
      `Completed ${aiInput}. Implementation follows best practices. All tests passing and ready for review.`
    );
    setShowAiPreview(true);
  };

  const handlePostAI = () => {
    setShowAiPreview(false);
    setAiInput('');
  };

  if (!issue) {
    return (
      <div
        data-testid="issue-detail-empty"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'linear-gradient(135deg, #fffbf7 0%, #fff5f0 100%)',
              border: '1px solid #ffe5e0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Pulse size={24} color="var(--col-background-brand)" weight="duotone" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 300, color: 'var(--col-text-primary)', marginBottom: 8, fontFamily: F, letterSpacing: '-0.2px' }}>
            Select an issue
          </div>
          <div style={{ fontSize: 14, fontWeight: 300, color: 'var(--col-text-subtle)', fontFamily: F, lineHeight: 1.6 }}>
            Choose an issue from the list to view details, track activity, and generate AI updates.
          </div>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[issue.status];

  // Convert real notes to timeline entries for display
  const realTimeline: TimelineEntry[] = realNotes.map((note) => ({
    type: note.system ? 'status' : 'comment',
    author: note.author.name,
    action: note.system ? note.body : 'commented',
    time: new Date(note.created_at).toLocaleString(),
    content: note.system ? undefined : note.body,
  }));

  const timelineEntries = isRealIssue ? realTimeline : (issue.timeline ?? []);

  return (
    <div
      data-testid="issue-detail-panel"
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Issue Header */}
      <div
        style={{
          padding: '28px 40px',
          borderBottom: '1px solid var(--col-border-illustrative)',
          background: '#ffffff',
          position: 'relative',
        }}
      >
        {/* UBS Impulse Line */}
        <div style={{ position: 'absolute', left: 0, top: 20, width: 4, height: 56, background: 'var(--col-background-brand)', borderRadius: '0 2px 2px 0' }} />

        {/* Status + ID row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <StatusIcon status={issue.status} size={16} />
          <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--col-text-subtle)', fontFamily: F, letterSpacing: '0.02em' }}>
            {issue.id}
          </span>
          <div data-testid="issue-status-badge" style={{ padding: '4px 12px', borderRadius: 6, background: statusCfg.bg, fontSize: 11, fontWeight: 500, color: statusCfg.color, fontFamily: F }}>
            {statusCfg.label}
          </div>
          <div data-testid="issue-priority-badge" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--col-border-illustrative)', fontSize: 11, fontWeight: 300, fontFamily: F, color: getPriorityColor(issue.priority) }}>
            <Tag size={12} weight="regular" />
            {getPriorityLabel(issue.priority)}
          </div>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 27, fontWeight: 400, lineHeight: 1.3, color: 'var(--col-text-primary)', marginBottom: 20, fontFamily: F, letterSpacing: '-0.2px', marginTop: 0 }}>
          {issue.title}
        </h1>

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: 'var(--col-text-subtle)', fontFamily: F, fontWeight: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} color="var(--col-text-subtle)" />
            {issue.assignee}
          </div>
          <div style={{ width: 1, height: 12, background: 'var(--col-border-illustrative)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color="var(--col-text-subtle)" />
            Updated {issue.updated}
          </div>
        </div>
      </div>

      {/* AI Input Section */}
      <div
        style={{
          padding: '24px 40px',
          borderBottom: '1px solid var(--col-border-illustrative)',
          background: 'linear-gradient(135deg, #fffbf7 0%, #fff5f0 100%)',
          borderLeft: '6px solid var(--col-background-brand)',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--col-background-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(225,43,30,0.25)' }}>
            <Sparkle size={20} color="#ffffff" weight="fill" />
          </div>
          <input
            type="text"
            data-testid="ai-input"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            placeholder="Type a quick update — AI will structure it..."
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #ffe5e0', borderRadius: 6, fontFamily: F, fontSize: 13, fontWeight: 300, color: 'var(--col-text-primary)', background: '#ffffff', outline: 'none', transition: 'border-color 0.15s' }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateAI(); }}
          />
          <button
            data-testid="ai-generate-btn"
            onClick={handleGenerateAI}
            disabled={!aiInput.trim()}
            style={{ padding: '10px 20px', background: aiInput.trim() ? 'var(--col-background-brand)' : '#e5e7eb', color: aiInput.trim() ? '#ffffff' : 'var(--col-text-subtle)', fontFamily: F, fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 6, cursor: aiInput.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', transition: 'all 0.2s ease', boxShadow: aiInput.trim() ? '0 2px 8px rgba(225,43,30,0.2)' : 'none' }}
          >
            Generate
          </button>
        </div>

        {/* AI Preview */}
        {showAiPreview && (
          <div data-testid="ai-preview" style={{ marginTop: 16, padding: '18px 20px', background: '#ffffff', border: '1px solid #ffe5e0', borderLeft: '4px solid var(--col-background-brand)', borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--col-background-brand)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontFamily: F }}>
              <Sparkle size={12} weight="fill" />
              AI Generated
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, fontWeight: 300, color: 'var(--col-text-primary)', marginBottom: 14, fontFamily: F }}>
              {aiPreviewText}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handlePostAI} style={{ padding: '8px 18px', fontFamily: F, fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: 'pointer', border: 'none', background: 'var(--col-background-brand)', color: '#ffffff', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(225,43,30,0.2)' }}>
                Post Update
              </button>
              <button onClick={() => setShowAiPreview(false)} style={{ padding: '8px 18px', fontFamily: F, fontSize: 12, fontWeight: 400, borderRadius: 6, cursor: 'pointer', background: '#ffffff', color: 'var(--col-text-subtle)', border: '1px solid var(--col-border-illustrative)', transition: 'all 0.15s' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: '#f7f7f5' }}>
        {/* Description */}
        {issue.description && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--col-text-subtle)', fontFamily: F, whiteSpace: 'nowrap' }}>
                Description
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--col-border-illustrative)' }} />
            </div>
            <div data-testid="issue-description" style={{ padding: '20px 24px', background: '#ffffff', borderRadius: 8, border: '1px solid var(--col-border-illustrative)', fontSize: 14, lineHeight: 1.7, fontWeight: 300, color: 'var(--col-text-primary)', fontFamily: F, transition: 'all 0.25s ease', cursor: 'default' }}>
              {issue.description}
            </div>
          </div>
        )}

        {/* Timeline / Comments */}
        {loadingNotes && (
          <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--col-text-subtle)', fontFamily: F, padding: 16, textAlign: 'center' }}>
            Loading comments...
          </div>
        )}

        {timelineEntries.length > 0 && (
          <IssueTimeline entries={timelineEntries} />
        )}

        {/* Add comment (for real GitLab issues) */}
        {isRealIssue && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--col-text-subtle)', fontFamily: F, whiteSpace: 'nowrap' }}>
                Add Comment
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--col-border-illustrative)' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                data-testid="comment-input"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid var(--col-border-illustrative)',
                  borderRadius: 8,
                  fontFamily: F,
                  fontSize: 13,
                  fontWeight: 300,
                  color: 'var(--col-text-primary)',
                  background: '#ffffff',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
              <button
                data-testid="post-comment-btn"
                onClick={handleAddComment}
                disabled={!commentInput.trim() || postingComment}
                style={{
                  padding: '10px 16px',
                  background: commentInput.trim() && !postingComment ? 'var(--col-background-brand)' : '#e5e7eb',
                  color: commentInput.trim() && !postingComment ? '#ffffff' : 'var(--col-text-subtle)',
                  fontFamily: F,
                  fontSize: 12,
                  fontWeight: 500,
                  border: 'none',
                  borderRadius: 6,
                  cursor: commentInput.trim() && !postingComment ? 'pointer' : 'not-allowed',
                  alignSelf: 'flex-end',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                }}
              >
                <PaperPlaneTilt size={14} />
                {postingComment ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
