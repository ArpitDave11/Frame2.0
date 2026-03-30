/**
 * WelcomeScreen — Main content area for the landing page.
 *
 * Adapted from the Figma prototype (1,300-line version).
 * No props — reads/writes Zustand stores directly.
 * Sidebar is NOT part of this component (rendered in App.tsx WelcomeLayout).
 *
 * Section IDs for sidebar scroll targets:
 *   home, actions, lifecycle, templates, quickstart
 */

import { useState } from 'react';
import {
  Sparkle,
  FileText,
  GitBranch,
  Graph,
  File,
  ListChecks,
  Upload,
  FlowArrow,
  CaretRight,
  CheckCircle,
  ArrowRight,
  DotsThree,
} from '@phosphor-icons/react';
import { useUiStore } from '@/stores/uiStore';
import { useEpicStore } from '@/stores/epicStore';
import { EPIC_CATEGORIES } from '@/domain/categoryConstants';
import { font } from '@/theme/tokens';

// ─── Constants ─────────────────────────────────────────────────

const F = font.sans;

const LIFECYCLE_STAGES = [
  {
    id: 'draft',
    name: 'Draft',
    description: 'Start with rough ideas or import from GitLab',
    icon: FileText,
    tip: 'Use any of the 7 templates or paste raw text',
  },
  {
    id: 'refine',
    name: 'AI Refine',
    description: '6-stage AI pipeline enhances structure and clarity',
    icon: Sparkle,
    tip: 'The AI runs through 6 stages: Comprehension \u2192 Classification \u2192 Structural \u2192 Refinement \u2192 Mandatory \u2192 Validation. Each stage improves your model\u2019s quality automatically.',
    highlight: true,
  },
  {
    id: 'score',
    name: 'Score',
    description: 'Get a quality score (0-10) based on completeness',
    icon: CheckCircle,
    tip: 'Scores \u22657.0 are ready to publish. Lower scores get specific improvement suggestions.',
  },
  {
    id: 'review',
    name: 'Review',
    description: 'Iterate with the AI assistant in the chat panel',
    icon: ListChecks,
    tip: 'The floating chat assistant lets you ask for section improvements, diagram adjustments, or clarity fixes in natural language.',
  },
  {
    id: 'publish',
    name: 'Publish',
    description: 'Export to GitLab with one click',
    icon: Upload,
    tip: 'Auto-formatted markdown ready for your team \u2014 no manual cleanup needed.',
  },
];

const ACTION_CARDS = [
  {
    id: 'create-parent',
    label: 'Create Requirement Model',
    description: 'Start with a structured template',
    icon: FileText,
    primary: true,
  },
  {
    id: 'modify',
    label: 'Refine Existing Model',
    description: 'Import from GitLab and refine',
    icon: GitBranch,
    primary: true,
  },
  {
    id: 'generate-diagrams',
    label: 'Generate diagrams',
    description: 'Auto-create architecture visuals',
    icon: Graph,
    primary: true,
  },
  {
    id: 'create-sub-epic',
    label: 'Create Sub-Model',
    description: 'Decompose into sub-specifications',
    icon: File,
    primary: false,
  },
  {
    id: 'create-issues',
    label: 'Create issues',
    description: 'Convert stories to tasks',
    icon: ListChecks,
    primary: false,
  },
  {
    id: 'publish',
    label: 'Publish to GitLab',
    description: 'One-click export',
    icon: Upload,
    primary: false,
  },
  {
    id: 'pipeline',
    label: 'End-to-end pipeline',
    description: 'Draft \u2192 Refine \u2192 Publish',
    icon: FlowArrow,
    primary: false,
  },
  {
    id: 'explore',
    label: 'Explore all features',
    description: 'Discover more capabilities',
    icon: DotsThree,
    primary: false,
  },
];

const STATS = [
  { label: '6x', sublabel: 'faster than manual', description: 'drafting' },
  { label: '8.2', sublabel: 'average quality', description: 'score' },
  { label: '7', sublabel: 'ready-made', description: 'templates' },
];

// Unsplash images from the prototype for primary action cards
const ACTION_IMAGES = [
  'https://images.unsplash.com/photo-1769731738826-a51acd5bddc7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmbG93Y2hhcnQlMjBkaWFncmFtJTIwd2hpdGVib2FyZCUyMHBsYW5uaW5nfGVufDF8fHx8MTc3Mzc3NDI4NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1763568258226-3e3f67a6577e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2RlJTIwZWRpdG9yJTIwc29mdHdhcmUlMjBkZXZlbG9wbWVudHxlbnwxfHx8fDE3NzM3OTc1MTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1753715613388-7e03410b1dce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcmNoaXRlY3R1cmUlMjBkaWFncmFtJTIwc3lzdGVtJTIwZGVzaWdufGVufDF8fHx8MTc3Mzc5NzUxNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
];

// Unsplash images from the prototype for template cards
const TEMPLATE_IMAGES = [
  'https://images.unsplash.com/photo-1759884247142-028abd1e8ac2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB3b3Jrc3BhY2UlMjBjb2xsYWJvcmF0aW9uJTIwdGVjaG5vbG9neXxlbnwxfHx8fDE3NzM3ODExMjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1748609160056-7b95f30041f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGFuYWx5dGljcyUyMGRhc2hib2FyZCUyMGRhdGF8ZW58MXx8fHwxNzczNzQ1OTg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1763739532819-401f6a041b54?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwcGxhbm5pbmclMjBzdHJhdGVneSUyMG1lZXRpbmd8ZW58MXx8fHwxNzczNzgxMTIxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1612886652368-3dfdfa8c4cbe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwdHJhbnNmb3JtYXRpb24lMjB3b3JrZmxvd3xlbnwxfHx8fDE3NzM3ODExMjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1616161560065-4bbfa1103fde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhaSUyMGFydGlmaWNpYWwlMjBpbnRlbGxpZ2VuY2UlMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3MzcyMzQ4NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1773517459502-54c3a9b103a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9qZWN0JTIwbWFuYWdlbWVudCUyMGRpYWdyYW0lMjBibHVlcHJpbnR8ZW58MXx8fHwxNzczNzgxMTIyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
];

// ─── Component ─────────────────────────────────────────────────

export function WelcomeScreen() {
  const setActiveView = useUiStore((s) => s.setActiveView);
  const setMarkdown = useEpicStore((s) => s.setMarkdown);
  const openModal = useUiStore((s) => s.openModal);

  const [selectedStage, setSelectedStage] = useState<string>('refine');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const selectedStageData = LIFECYCLE_STAGES.find((s) => s.id === selectedStage);

  // ─── Handlers ──────────────────────────────────────────────

  const handleCreateModel = (categoryId?: string) => {
    if (categoryId) {
      const cat = EPIC_CATEGORIES.find((c) => c.id === categoryId);
      if (cat) {
        if (cat.secs.length > 0) {
          const md = cat.secs.map((s) => `## ${s}\n\n_Your content here..._\n`).join('\n');
          setMarkdown(md);
        } else {
          // General category: set minimal prompt so editor enters active mode
          setMarkdown('# \n\n_Start writing your requirements here..._\n');
        }
      }
    }
    setActiveView('workspace');
  };

  const handleLoadFromGitLab = () => {
    setActiveView('workspace');
    openModal('loadEpic');
  };

  const handleActionClick = (actionId: string) => {
    if (actionId === 'create-parent' || actionId === 'create-sub-epic') {
      handleCreateModel();
    } else if (actionId === 'modify') {
      handleLoadFromGitLab();
    }
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div
      data-testid="welcome-screen"
      style={{
        flex: 1,
        background: '#f7f7f5',
        overflow: 'auto',
        fontFamily: F,
      }}
    >
      {/* Hero Section */}
      <section
        id="home"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '64px 48px 32px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          alignItems: 'center',
        }}
      >
        {/* Left: Value Proposition */}
        <div style={{ position: 'relative' }}>
          {/* UBS Impulse Line */}
          <div
            style={{
              position: 'absolute',
              left: -24,
              top: 6,
              width: 4,
              height: 72,
              background: 'var(--col-background-brand)',
              borderRadius: 2,
            }}
          />
          <h1
            style={{
              fontSize: 42,
              fontWeight: 400,
              lineHeight: 1.25,
              marginBottom: 20,
              color: 'var(--col-text-primary)',
              letterSpacing: '-0.5px',
            }}
          >
            FRAME — Your Vision.<br />AI-Engineered Precision.
          </h1>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '0.5px',
              color: 'var(--col-text-subtle)',
              marginBottom: 6,
              maxWidth: 480,
            }}
          >
            Feature Requirement Agentic Modeling Engine
          </p>
          <p
            style={{
              fontSize: 15,
              fontWeight: 300,
              lineHeight: 1.5,
              color: 'var(--col-text-subtle)',
              marginBottom: 0,
              maxWidth: 480,
              opacity: 0.75,
            }}
          >
            Consistent, governed specifications across every team
          </p>
        </div>

        {/* Right: Stats Cards - Horizontal Layout */}
        <div style={{ display: 'flex', gap: 16 }}>
          {STATS.map((stat, i) => (
            <div
              key={i}
              data-testid={`stat-card-${i}`}
              style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid var(--col-border-illustrative)',
                borderRadius: 16,
                padding: '28px 20px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Top accent bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 40,
                  height: 3,
                  background: 'var(--col-background-brand)',
                  borderRadius: '0 0 4px 4px',
                }}
              />
              <div
                style={{
                  fontSize: 45,
                  fontWeight: 300,
                  color: 'var(--col-background-brand)',
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--col-text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {stat.sublabel}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 300,
                  color: 'var(--col-text-subtle)',
                  marginTop: 2,
                }}
              >
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What You Can Do Section */}
      <section
        id="actions"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '0 48px 80px',
        }}
      >
        {/* Divider with heading */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 48,
          }}
        >
          <h2
            style={{
              fontSize: 27,
              fontWeight: 400,
              color: 'var(--col-text-primary)',
              letterSpacing: '-0.2px',
              whiteSpace: 'nowrap',
            }}
          >
            What you can do
          </h2>
          <span
            style={{
              fontSize: 14,
              fontWeight: 300,
              color: 'var(--col-text-subtle)',
              whiteSpace: 'nowrap',
            }}
          >
            Choose your workflow
          </span>
          <div
            style={{
              flex: 1,
              height: 1,
              background: 'var(--col-border-illustrative)',
            }}
          />
        </div>

        {/* Features Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
          }}
        >
          {/* Top Row: Primary Actions (Large Cards) */}
          {ACTION_CARDS.filter((a) => a.primary).map((action, idx) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                data-testid={`action-${action.id}`}
                onClick={() => handleActionClick(action.id)}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--col-border-illustrative)',
                  borderRadius: 16,
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s ease, border-color 0.3s ease',
                  fontFamily: F,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.07)';
                  e.currentTarget.style.borderColor = 'var(--col-background-brand)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'var(--col-border-illustrative)';
                }}
              >
                {/* Image Header */}
                <div
                  style={{
                    position: 'relative',
                    height: 160,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={ACTION_IMAGES[idx]}
                    alt={action.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLImageElement>) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLImageElement>) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                  {/* Icon Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 16,
                      width: 40,
                      height: 40,
                      background: 'var(--col-background-brand)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(225,43,30,0.3)',
                    }}
                  >
                    <Icon size={20} color="#ffffff" weight="regular" />
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '20px' }}>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: 'var(--col-text-primary)',
                    }}
                  >
                    {action.label}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 300,
                      color: 'var(--col-text-subtle)',
                    }}
                  >
                    {action.description}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Bottom Row: Secondary Actions (Small Cards spanning full width) */}
          <div
            style={{
              gridColumn: '1 / -1',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 14,
            }}
          >
            {ACTION_CARDS.filter((a) => !a.primary).map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  data-testid={`action-${action.id}`}
                  onClick={() => handleActionClick(action.id)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--col-border-illustrative)',
                    borderRadius: 12,
                    padding: '20px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s ease, border-color 0.3s ease',
                    fontFamily: F,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.05)';
                    e.currentTarget.style.borderColor = 'var(--col-background-brand)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--col-border-illustrative)';
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: '#fffafa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                  >
                    <Icon size={18} color="var(--col-background-brand)" weight="regular" />
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      marginBottom: 3,
                      color: 'var(--col-text-primary)',
                    }}
                  >
                    {action.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 300,
                      color: 'var(--col-text-subtle)',
                    }}
                  >
                    {action.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Epic Lifecycle Section */}
      <section
        id="lifecycle"
        style={{
          background: '#ffffff',
          borderTop: '1px solid var(--col-border-illustrative)',
          borderBottom: '1px solid var(--col-border-illustrative)',
          padding: '100px 60px',
        }}
      >
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 400,
                marginBottom: 12,
                color: 'var(--col-text-primary)',
                letterSpacing: '-0.3px',
              }}
            >
              How it works: Model lifecycle
            </h2>
            <p
              style={{
                fontSize: 16,
                fontWeight: 300,
                color: 'var(--col-text-subtle)',
                margin: 0,
              }}
            >
              Five stages from draft to published specification
            </p>
          </div>

          {/* Stage Pipeline */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 48,
              position: 'relative',
            }}
          >
            {LIFECYCLE_STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isSelected = stage.id === selectedStage;
              const isHighlight = stage.highlight;

              return (
                <div
                  key={stage.id}
                  style={{ flex: 1, position: 'relative', display: 'flex' }}
                >
                  {/* Stage Card */}
                  <button
                    data-testid={`lifecycle-${stage.id}`}
                    onClick={() => setSelectedStage(stage.id)}
                    style={{
                      flex: 1,
                      background: isSelected
                        ? '#ffffff'
                        : isHighlight
                          ? '#fffafa'
                          : '#fafafa',
                      border: isSelected
                        ? '2px solid var(--col-background-brand)'
                        : isHighlight
                          ? '2px solid #ffcccc'
                          : '1px solid var(--col-border-illustrative)',
                      borderRadius: 8,
                      padding: '24px 20px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.25s',
                      fontFamily: F,
                      position: 'relative',
                      zIndex: isSelected ? 2 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor =
                          'var(--col-background-brand)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow =
                          '0 4px 12px rgba(0,0,0,0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = isHighlight
                          ? '#ffcccc'
                          : 'var(--col-border-illustrative)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: isSelected
                          ? 'var(--col-background-brand)'
                          : isHighlight
                            ? '#ffe5e5'
                            : '#ffffff',
                        border: isSelected
                          ? 'none'
                          : '1px solid var(--col-border-illustrative)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        transition: 'all 0.25s',
                      }}
                    >
                      <Icon
                        size={22}
                        color={
                          isSelected
                            ? '#ffffff'
                            : isHighlight
                              ? 'var(--col-background-brand)'
                              : 'var(--col-text-subtle)'
                        }
                        weight={isSelected ? 'fill' : 'regular'}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: isSelected ? 500 : 400,
                        marginBottom: 6,
                        color: isSelected
                          ? 'var(--col-text-primary)'
                          : 'var(--col-text-subtle)',
                      }}
                    >
                      {stage.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 300,
                        color: 'var(--col-text-subtle)',
                        lineHeight: 1.5,
                      }}
                    >
                      {stage.description}
                    </div>
                  </button>

                  {/* Arrow Between Stages */}
                  {i < LIFECYCLE_STAGES.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: -6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 3,
                      }}
                    >
                      <CaretRight
                        size={12}
                        color="var(--col-text-subtle)"
                        weight="bold"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selectedStageData && (
            <div
              data-testid="lifecycle-detail"
              style={{
                background: 'linear-gradient(135deg, #fffbf7 0%, #fff5f0 100%)',
                border: '1px solid #ffe5e0',
                borderLeft: '6px solid var(--col-background-brand)',
                borderRadius: 8,
                padding: '28px 32px',
                animation: 'ubsFade 0.3s ease-out',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--col-background-brand)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Sparkle size={16} color="#ffffff" weight="fill" />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      marginBottom: 8,
                      color: 'var(--col-text-primary)',
                    }}
                  >
                    {selectedStageData.name} stage details
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 300,
                      color: 'var(--col-text-subtle)',
                      lineHeight: 1.7,
                    }}
                  >
                    {selectedStageData.tip}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Template Catalog Section */}
      <section
        id="templates"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '100px 60px',
        }}
      >
        <div style={{ marginBottom: 40 }}>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 400,
              marginBottom: 12,
              color: 'var(--col-text-primary)',
              letterSpacing: '-0.3px',
            }}
          >
            Template catalog
          </h2>
          <p
            style={{
              fontSize: 16,
              fontWeight: 300,
              color: 'var(--col-text-subtle)',
              margin: 0,
            }}
          >
            Choose a template to match your requirement type — hover to see sections
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 24,
          }}
        >
          {EPIC_CATEGORIES.filter((cat) => cat.id !== 'general').map((cat, idx) => {
            const isHovered = hoveredTemplate === cat.id;

            return (
              <button
                key={cat.id}
                data-testid={`template-${cat.id}`}
                onClick={() => handleCreateModel(cat.id)}
                onMouseEnter={() => setHoveredTemplate(cat.id)}
                onMouseLeave={() => setHoveredTemplate(null)}
                style={{
                  background: '#ffffff',
                  border: isHovered
                    ? '2px solid var(--col-background-brand)'
                    : '1px solid var(--col-border-illustrative)',
                  borderRadius: 8,
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: F,
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 280,
                  boxShadow: isHovered
                    ? '0 8px 24px rgba(0,0,0,0.12)'
                    : 'none',
                  transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                }}
              >
                {/* Image Header */}
                <div
                  style={{
                    position: 'relative',
                    height: 140,
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={TEMPLATE_IMAGES[idx % TEMPLATE_IMAGES.length]}
                    alt={cat.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLImageElement>) => {
                      if (isHovered) e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e: React.MouseEvent<HTMLImageElement>) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '60%',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      width: 52,
                      height: 52,
                      borderRadius: 8,
                      background: isHovered
                        ? 'var(--col-background-brand)'
                        : 'linear-gradient(135deg, #e60000 0%, #b30000 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      transition: 'all 0.3s',
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 28,
                        fontWeight: 400,
                        color: '#ffffff',
                      }}
                    >
                      {cat.icon}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: isHovered ? '19px 24px 24px' : '20px 24px 24px' }}>
                  {/* Template Name */}
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 500,
                      marginBottom: 8,
                      color: 'var(--col-text-primary)',
                    }}
                  >
                    {cat.label}
                  </div>

                  {/* Section Count */}
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 300,
                      color: 'var(--col-text-subtle)',
                      marginBottom: isHovered ? 16 : 0,
                    }}
                  >
                    {cat.secs.length} sections included
                  </div>

                  {/* Expanded Section List */}
                  {isHovered && (
                    <div
                      style={{
                        borderTop: '1px solid var(--col-border-illustrative)',
                        paddingTop: 14,
                        animation: 'ubsFade 0.25s ease-out',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: 'var(--col-text-subtle)',
                          marginBottom: 10,
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                        }}
                      >
                        Sections
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {cat.secs.slice(0, 5).map((sec, i) => (
                          <div
                            key={i}
                            style={{
                              fontSize: 13,
                              fontWeight: 300,
                              color: 'var(--col-text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: '50%',
                                background: 'var(--col-background-brand)',
                                flexShrink: 0,
                              }}
                            />
                            {sec}
                          </div>
                        ))}
                        {cat.secs.length > 5 && (
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 400,
                              color: 'var(--col-background-brand)',
                              fontStyle: 'italic',
                              marginTop: 4,
                            }}
                          >
                            +{cat.secs.length - 5} more sections
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick Start CTA */}
      <section
        id="quickstart"
        style={{
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)',
          padding: '56px 60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'var(--col-background-brand)',
          }}
        />
        <div
          style={{
            maxWidth: 1440,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 28,
                fontWeight: 400,
                marginBottom: 10,
                color: 'var(--col-text-inverted)',
                letterSpacing: '-0.3px',
              }}
            >
              Ready to get started?
            </h3>
            <p
              style={{
                fontSize: 16,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.75)',
                margin: 0,
              }}
            >
              Create your first model or import existing work from GitLab
            </p>
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button
              data-testid="cta-create"
              onClick={() => handleCreateModel()}
              style={{
                padding: '16px 36px',
                border: 'none',
                borderRadius: 6,
                background: 'var(--col-background-brand)',
                color: 'var(--col-text-inverted)',
                fontSize: 16,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: F,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.25s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ff1a1a';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(230,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--col-background-brand)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Create your first model
              <ArrowRight size={20} weight="bold" />
            </button>

            <button
              data-testid="cta-gitlab"
              onClick={handleLoadFromGitLab}
              style={{
                padding: '16px 36px',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--col-text-inverted)',
                fontSize: 16,
                fontWeight: 400,
                cursor: 'pointer',
                fontFamily: F,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'all 0.25s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#ffffff';
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Load from GitLab
              <GitBranch size={20} weight="regular" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
