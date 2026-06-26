import { useState, useEffect, useRef } from 'react';
import {
  Lightbulb, PenLine, Eye, CheckCircle, CalendarClock, Send,
  UserCheck, XCircle, Hash, Sparkles, Clock, Activity, Trash2,
  MessageSquare, ChevronLeft, Image, Link2, Plus, X, Loader2,
  ClipboardCheck, Tag,
} from 'lucide-react';
import { useHashtags, useCreateHashtagSet, useDeleteHashtagSet } from '@/hooks/useHashtags';
import api from '@/lib/api';
import { useParams, useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { usePost, useUpdatePost, useDeletePost } from '@/hooks/usePosts';
import { useChecklist, useAddChecklistItem, useToggleChecklistItem, useDeleteChecklistItem } from '@/hooks/useChecklist';
import { useAddComment, useDeleteComment } from '@/hooks/useComments';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/stores/authStore';
import { useQueryClient } from '@tanstack/react-query';
import StatusBadge from '@/components/StatusBadge';
import PlatformBadge from '@/components/PlatformBadge';
import ClientAvatar from '@/components/ClientAvatar';

/* ─── Constants ─── */
const STATUS_FLOW = ['IDEA', 'DRAFT', 'REVIEW', 'APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED'];

const STATUS_LABELS = {
  IDEA: 'Idea', DRAFT: 'Draft', REVIEW: 'In Review',
  APPROVED: 'Approved', CLIENT_APPROVED: 'Client Approved',
  SCHEDULED: 'Scheduled', PAUSED: 'Paused', PUBLISHED: 'Published', REJECTED: 'Changes Requested',
};

const CONTENT_TYPES = ['CAROUSEL', 'REEL', 'STATIC_IMAGE', 'VIDEO', 'STORY', 'THREAD', 'LONG_FORM'];
const CONTENT_TYPE_LABELS = {
  CAROUSEL: 'Carousel', REEL: 'Reel', STATIC_IMAGE: 'Static',
  VIDEO: 'Video', STORY: 'Story', THREAD: 'Thread', LONG_FORM: 'Long-form',
};

const STEP_CONFIG = {
  IDEA:           { label: 'Idea',       Icon: Lightbulb     },
  DRAFT:          { label: 'Draft',      Icon: PenLine       },
  REVIEW:         { label: 'In Review',  Icon: Eye           },
  APPROVED:       { label: 'Approved',   Icon: CheckCircle   },
  CLIENT_APPROVED:{ label: 'Client OK',  Icon: UserCheck     },
  SCHEDULED:      { label: 'Scheduled',  Icon: CalendarClock },
  PUBLISHED:      { label: 'Published',  Icon: Send          },
};

const ACTION_LABELS = {
  created:            { label: 'Created',              icon: PenLine      },
  status_change:      { label: 'Status changed',       icon: Activity     },
  bulk_status_change: { label: 'Status changed (bulk)', icon: Activity    },
  scheduled:          { label: 'Scheduled',            icon: CalendarClock},
};

/* ─── Quick action config by status ─── */
function getQuickActions(status) {
  switch (status) {
    case 'IDEA':           return [{ label: 'Move to Draft',       to: 'DRAFT',          primary: true  }];
    case 'DRAFT':          return [{ label: 'Submit for Review',   to: 'REVIEW',         primary: true  }];
    case 'REVIEW':         return [
      { label: 'Approve (Internal)',  to: 'APPROVED',       primary: true  },
      { label: 'Back to Draft',       to: 'DRAFT',          primary: false },
      { label: 'Request Changes',     to: 'REJECTED',       primary: false, needsReason: true },
    ];
    case 'APPROVED':       return [{ label: 'Mark Client Approved', to: 'CLIENT_APPROVED', primary: true }];
    case 'CLIENT_APPROVED':return [{ label: 'Mark Scheduled',       to: 'SCHEDULED',      primary: true  }];
    case 'SCHEDULED':      return [{ label: 'Mark Published',       to: 'PUBLISHED',      primary: true  }];
    case 'REJECTED':       return [{ label: 'Move back to Draft',   to: 'DRAFT',          primary: true  }];
    default:               return [];
  }
}

const fieldLabelStyle = {
  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
};
const sidebarSelectStyle = {
  width: '100%', background: 'var(--bg)', border: '1px solid rgba(0,0,0,0.1)',
  color: 'var(--text)', borderRadius: 7, padding: '5px 8px',
  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
};

/* ═══════════════════════════════════════════════════════════════ */
export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const { data: post, isLoading } = usePost(id);
  const { data: checklist = [] } = useChecklist(id);
  const updatePost    = useUpdatePost();
  const deletePost    = useDeletePost();
  const addItem       = useAddChecklistItem(id);
  const toggleItem    = useToggleChecklistItem(id);
  const deleteItem    = useDeleteChecklistItem(id);
  const addComment    = useAddComment(id);
  const deleteComment = useDeleteComment(id);
  const { data: users = [] } = useUsers();

  const [newChecklistLabel, setNewChecklistLabel] = useState('');
  const [commentBody,       setCommentBody]        = useState('');
  const [editCaption,       setEditCaption]         = useState(false);
  const [caption,           setCaption]             = useState('');
  const [deleteConfirm,     setDeleteConfirm]       = useState(false);

  // Rejection reason
  const [rejectOpen,  setRejectOpen]  = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Media URL add
  const [addingMedia, setAddingMedia] = useState(false);
  const [newMediaUrl, setNewMediaUrl] = useState('');

  const captionRef = useRef(null);

  useEffect(() => { if (post) setCaption(post.caption ?? ''); }, [post]);

  async function patch(data) {
    await updatePost.mutateAsync({ id, ...data });
  }

  async function handleStatusChange(status, extra = {}) {
    await patch({ status, ...extra });
  }

  async function handleSaveCaption() {
    await patch({ caption });
    setEditCaption(false);
  }

  async function handleAddChecklist(e) {
    e.preventDefault();
    if (!newChecklistLabel.trim()) return;
    await addItem.mutateAsync({ label: newChecklistLabel.trim() });
    setNewChecklistLabel('');
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    await addComment.mutateAsync(commentBody.trim());
    setCommentBody('');
  }

  async function handleReject(e) {
    e.preventDefault();
    await patch({ status: 'REJECTED', rejectionReason: rejectReason.trim() || null });
    setRejectOpen(false);
    setRejectReason('');
  }

  async function handleAddMedia(e) {
    e.preventDefault();
    if (!newMediaUrl.trim()) return;
    const current = post.mediaUrls ?? [];
    await patch({ mediaUrls: [...current, newMediaUrl.trim()] });
    setNewMediaUrl('');
    setAddingMedia(false);
  }

  async function handleRemoveMedia(url) {
    await patch({ mediaUrls: (post.mediaUrls ?? []).filter((u) => u !== url) });
  }

  async function handleDelete() {
    await deletePost.mutateAsync(id);
    navigate(-1);
  }

  const isClient = currentUser?.role === 'CLIENT';
  const canClientApprove = ['SUPER_ADMIN', 'ADMIN', 'CLIENT'].includes(currentUser?.role);

  if (isLoading) return <p style={{ color: 'var(--muted)' }}>Loading…</p>;
  if (!post) return <p style={{ color: 'var(--danger)' }}>Post not found.</p>;

  const completedCount = checklist.filter((i) => i.completed).length;
  const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;
  const allQuickActions = getQuickActions(post.status);
  const quickActions = allQuickActions.filter((a) =>
    a.to === 'CLIENT_APPROVED' ? canClientApprove : true
  );
  const currentIdx = STATUS_FLOW.indexOf(post.status);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 20, alignItems: 'start' }}>

      {/* ── Main column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Back + header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '4px 0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.12s', borderRadius: 6 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
          >
            <ChevronLeft size={15} /> Posts
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            {post.client && <ClientAvatar client={post.client} size={36} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>{post.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{post.client?.name}</span>
                {post.contentType && (
                  <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 980, background: '#F0F0F0', border: '1px solid rgba(0,0,0,0.08)', color: '#6B6B6B', fontWeight: 500 }}>
                    {CONTENT_TYPE_LABELS[post.contentType] ?? post.contentType}
                  </span>
                )}
                {(post.platforms ?? []).map((p) => <PlatformBadge key={p} platform={p} />)}
              </div>
            </div>
            <StatusBadge status={post.status} />
          </div>
        </div>

        {/* Admin: contextual action bar */}
        {!isClient && quickActions.length > 0 && !rejectOpen && (
          <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                Next step
              </p>
            </div>
            {quickActions.map((action) => (
              action.needsReason ? (
                <button key={action.to} onClick={() => setRejectOpen(true)}
                  className="secondary-button"
                  style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <XCircle size={13} /> {action.label}
                </button>
              ) : (
                <button key={action.to}
                  onClick={() => handleStatusChange(action.to)}
                  disabled={updatePost.isPending}
                  className={action.primary ? 'primary-button' : 'secondary-button'}
                  style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Send size={12} /> {action.label}
                </button>
              )
            ))}
          </div>
        )}

        {/* Client: approve / request changes bar (only shown when post is APPROVED) */}
        {isClient && post.status === 'APPROVED' && !rejectOpen && (
          <div className="panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderLeft: '3px solid #111111' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Ready for your sign-off</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>Review the caption and media, then approve or request changes.</p>
            </div>
            <button onClick={() => setRejectOpen(true)} className="secondary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
              <XCircle size={13} /> Request Changes
            </button>
            <button
              onClick={() => handleStatusChange('CLIENT_APPROVED', { clientApprovedBy: currentUser?.name })}
              disabled={updatePost.isPending}
              className="primary-button"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <CheckCircle size={13} /> {updatePost.isPending ? 'Saving…' : 'Approve'}
            </button>
          </div>
        )}

        {/* Rejection / change-request reason form */}
        {rejectOpen && (
          <div className="panel" style={{ padding: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>
              {isClient ? 'What needs to change?' : 'Reason for requesting changes'}
            </p>
            <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Describe what needs to be changed…"
                rows={3}
                autoFocus
                style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5, background: 'var(--bg)', color: 'var(--text)' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="secondary-button" style={{ fontSize: 13 }} onClick={() => setRejectOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button" style={{ fontSize: 13 }} disabled={updatePost.isPending}>
                  Send feedback
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rejection reason display */}
        {post.status === 'REJECTED' && post.rejectionReason && (
          <div style={{ padding: '10px 14px', background: '#FFF8F8', border: '1px solid #FECACA', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <XCircle size={13} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#3A3A3A', lineHeight: 1.5 }}>
              <strong>Changes requested:</strong> {post.rejectionReason}
            </span>
          </div>
        )}

        {/* Workflow stepper */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <p className="eyebrow" style={{ margin: '0 0 14px' }}>Workflow</p>
          <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto', paddingBottom: 2 }}>
            {STATUS_FLOW.map((s, i) => {
              const cfg       = STEP_CONFIG[s];
              const isPast    = i < currentIdx;
              const isCurrent = i === currentIdx || (post.status === 'REJECTED' && s === 'REVIEW');
              const isFuture  = i > currentIdx && !(post.status === 'REJECTED' && s === 'REVIEW');
              const { Icon }  = cfg;

              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_FLOW.length - 1 ? '1 1 auto' : '0 0 auto' }}>
                  <button
                    onClick={isClient ? undefined : () => handleStatusChange(s)}
                    title={isClient ? cfg.label : `Set to ${cfg.label}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: isClient ? 'default' : 'pointer', padding: '0 5px', flexShrink: 0 }}
                  >
                    <div style={{
                      width: isCurrent ? 34 : 27, height: isCurrent ? 34 : 27,
                      borderRadius: '50%',
                      background: isCurrent ? '#111111' : isPast ? '#3A3A3A' : '#EBEBEB',
                      border: isFuture ? '1.5px solid #D0D0D0' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s',
                      boxShadow: isCurrent ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    }}>
                      <Icon size={isCurrent ? 14 : 12} strokeWidth={isCurrent ? 2 : 1.8}
                        color={isCurrent || isPast ? '#fff' : '#ADADAD'} />
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? '#111111' : isPast ? '#3A3A3A' : '#ADADAD', whiteSpace: 'nowrap' }}>
                      {cfg.label}
                    </span>
                  </button>
                  {i < STATUS_FLOW.length - 1 && (
                    <div style={{ flex: 1, height: 1.5, background: isPast ? '#3A3A3A' : '#E0E0E0', borderRadius: 2, marginBottom: 18, minWidth: 10, transition: 'background 0.18s' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Caption */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Caption / Copy</h3>
            {!isClient && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <AICaptionButton post={post} onInsert={(text) => { setCaption(text); setEditCaption(true); }} />
                {!editCaption && (
                  <button
                    onClick={() => { setEditCaption(true); setTimeout(() => captionRef.current?.focus(), 50); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: '3px 8px', borderRadius: 6 }}
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>
          {editCaption && !isClient ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Textarea ref={captionRef} value={caption} onChange={(e) => setCaption(e.target.value)} rows={8}
                style={{ fontFamily: 'inherit', fontSize: 14, lineHeight: 1.65, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleSaveCaption} disabled={updatePost.isPending} className="primary-button" style={{ fontSize: 13 }}>
                  {updatePost.isPending ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => { setEditCaption(false); setCaption(post.caption ?? ''); }} className="secondary-button" style={{ fontSize: 13 }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: post.caption ? 'var(--text)' : 'var(--muted)', fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>
              {post.caption || (isClient ? 'No caption yet.' : 'No caption yet. Click Edit to add copy.')}
            </p>
          )}
        </div>

        {/* Media */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (post.mediaUrls?.length > 0 || addingMedia) ? 12 : 0 }}>
            <h3 style={{ margin: 0 }}>Media</h3>
            {!isClient && !addingMedia && (
              <button onClick={() => setAddingMedia(true)} className="secondary-button" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Plus size={12} /> Add URL
              </button>
            )}
          </div>

          {addingMedia && (
            <form onSubmit={handleAddMedia} style={{ display: 'flex', gap: 8, marginBottom: (post.mediaUrls?.length > 0) ? 10 : 0 }}>
              <input
                type="url" value={newMediaUrl} onChange={(e) => setNewMediaUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
                autoFocus
                style={{ flex: 1, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <button type="button" onClick={() => { setAddingMedia(false); setNewMediaUrl(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
                <X size={14} />
              </button>
              <button type="submit" className="primary-button" style={{ fontSize: 12 }}>Add</button>
            </form>
          )}

          {(post.mediaUrls ?? []).length === 0 && !addingMedia ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{isClient ? 'No media attached.' : 'No media attached. Add a Drive, Dropbox, or Figma link.'}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(post.mediaUrls ?? []).map((url, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Link2 size={13} style={{ color: 'var(--muted-2)', flexShrink: 0 }} />
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, color: 'var(--text)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                  >
                    {url}
                  </a>
                  {!isClient && (
                    <button onClick={() => handleRemoveMedia(url)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 2, display: 'flex', borderRadius: 4 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-2)'; }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ margin: 0 }}>Checklist</h3>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{completedCount}/{checklist.length} done</span>
          </div>

          {checklist.length > 0 && (
            <div style={{ height: 3, background: '#E8E8E8', borderRadius: 999, margin: '10px 0 14px' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#111111', borderRadius: 999, transition: 'width 0.3s' }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {checklist.map((item, idx) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: idx < checklist.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                <Checkbox checked={item.completed} onCheckedChange={isClient ? undefined : () => toggleItem.mutate(item.id)} id={`item-${item.id}`} disabled={isClient} />
                <label htmlFor={`item-${item.id}`} style={{ flex: 1, fontSize: 13, cursor: 'pointer', textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--muted)' : 'var(--text)' }}>
                  {item.label}
                </label>
                {item.completedBy && (
                  <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>{item.completedBy.name}</span>
                )}
                {!isClient && (
                  <button onClick={() => deleteItem.mutate(item.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 2, display: 'flex', borderRadius: 4, opacity: 0.6 }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--muted-2)'; }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!isClient && (
            <form onSubmit={handleAddChecklist} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <input
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
                placeholder="Add checklist item…"
                style={{ flex: 1, border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <button type="submit" disabled={addItem.isPending} className="primary-button" style={{ fontSize: 13 }}>Add</button>
            </form>
          )}
        </div>

        {/* Publishing checklist — visible for APPROVED → PUBLISHED statuses */}
        {['APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED'].includes(post.status) && (
          <PublishingChecklist post={post} onSave={(checklist) => patch({ publishChecklist: checklist })} isClient={isClient} />
        )}

        {/* Internal Notes — hidden for CLIENT users */}
        {!isClient && <div className="panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px' }}>Internal Notes</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {post.comments?.length === 0 && (
              <div style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={13} color="var(--muted-2)" />
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No notes yet. Add one to leave feedback for the team.</p>
              </div>
            )}
            {post.comments?.map((c) => (
              <div key={c.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                    {(c.userId === currentUser?.id || currentUser?.role === 'ADMIN') && (
                      <button onClick={() => deleteComment.mutate(c.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', display: 'flex', padding: 2, borderRadius: 4 }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-2)'; }}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Add a note or feedback…" rows={3}
              style={{ fontFamily: 'inherit', fontSize: 13, resize: 'vertical', lineHeight: 1.5 }} />
            <button type="submit" disabled={addComment.isPending} className="primary-button" style={{ fontSize: 13, alignSelf: 'flex-start' }}>
              Post Note
            </button>
          </form>
        </div>}
      </div>

      {/* ── Right sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Post settings — all editable */}
        <div className="panel" style={{ padding: 18 }}>
          <p style={{ margin: '0 0 14px', fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.1px' }}>Post Settings</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div>
              <p style={fieldLabelStyle}>Status</p>
              <StatusBadge status={post.status} />
            </div>

            <div>
              <p style={fieldLabelStyle}>Content Type</p>
              {isClient ? (
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{post.contentType ? (CONTENT_TYPE_LABELS[post.contentType] ?? post.contentType) : 'Not set'}</span>
              ) : (
                <select value={post.contentType ?? ''} onChange={(e) => patch({ contentType: e.target.value || null })} style={sidebarSelectStyle}>
                  <option value="">Not set</option>
                  {CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
                </select>
              )}
            </div>

            <div>
              <p style={fieldLabelStyle}>Assigned To</p>
              {isClient ? (
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{post.assignedTo?.name ?? 'Unassigned'}</span>
              ) : (
                <select value={post.assignedToId ?? ''} onChange={(e) => patch({ assignedToId: e.target.value || null })} style={sidebarSelectStyle}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
            </div>

            <div>
              <p style={fieldLabelStyle}>Scheduled Date</p>
              {isClient ? (
                <span style={{ fontSize: 13, color: 'var(--text)' }}>
                  {post.scheduledAt ? new Date(post.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not scheduled'}
                </span>
              ) : (
                <input
                  type="datetime-local"
                  value={post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ''}
                  onChange={(e) => patch({ scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  style={{ ...sidebarSelectStyle, fontSize: 12 }}
                />
              )}
            </div>

            <div>
              <p style={fieldLabelStyle}>Platforms</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(post.platforms ?? []).map((p) => <PlatformBadge key={p} platform={p} />)}
              </div>
            </div>

            {(post.taggedPages ?? []).length > 0 && (
              <div>
                <p style={fieldLabelStyle}>Collab / Tag Pages</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(post.taggedPages ?? []).map((pg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--bg)', borderRadius: 6, border: '1px solid rgba(0,0,0,0.07)' }}>
                      <Tag size={10} color="var(--muted)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 500, flex: 1 }}>{pg.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{pg.handle}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 14, paddingTop: 12 }}>
            <p style={fieldLabelStyle}>Created by</p>
            <span style={{ fontSize: 12, color: 'var(--text)' }}>{post.createdBy?.name}</span>
            <p style={{ ...fieldLabelStyle, marginTop: 8 }}>Created on</p>
            <span style={{ fontSize: 12, color: 'var(--text)' }}>
              {new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>

          {!isClient && (
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 14, paddingTop: 12 }}>
              {!deleteConfirm ? (
                <button onClick={() => setDeleteConfirm(true)} style={{ background: 'none', border: '1px solid #FECACA', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 500, padding: '5px 10px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                  <Trash2 size={11} /> Delete post
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sure?</span>
                  <button onClick={handleDelete} disabled={deletePost.isPending} style={{ background: '#EF4444', border: 'none', color: '#fff', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {deletePost.isPending ? '…' : 'Delete'}
                  </button>
                  <button onClick={() => setDeleteConfirm(false)} className="secondary-button" style={{ fontSize: 12 }}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hashtag bank — team only */}
        {!isClient && <HashtagBank clientId={post.clientId} post={post} />}

        {/* Activity log */}
        <ActivityLog activities={post.activities ?? []} />
      </div>
    </div>
  );
}

/* ═══ Publishing Checklist ════════════════════════════════════════════════ */
const PUBLISH_ITEMS = [
  { key: 'captionConfirmed',   label: 'Final caption matches approved copy' },
  { key: 'repostedToStories',  label: 'Reposted to Stories' },
  { key: 'storyHasText',       label: 'Story has text / caption added' },
  { key: 'storyHashtags',      label: 'Story has hashtags' },
  { key: 'collabTagged',       label: 'Collab / tag pages confirmed and tagged' },
  { key: 'linkInBioUpdated',   label: 'Link in bio updated (if applicable)' },
];

function PublishingChecklist({ post, onSave, isClient }) {
  const [checklist, setChecklist] = useState(() => {
    const saved = post.publishChecklist ?? {};
    const defaults = {};
    PUBLISH_ITEMS.forEach(({ key }) => { defaults[key] = saved[key] ?? false; });
    return defaults;
  });

  function toggle(key) {
    if (isClient) return;
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      onSave(next);
      return next;
    });
  }

  const done  = PUBLISH_ITEMS.filter(({ key }) => checklist[key]).length;
  const total = PUBLISH_ITEMS.length;
  const pct   = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div className="panel" style={{ padding: 20, borderLeft: `3px solid ${allDone ? '#16A34A' : '#D97706'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
          <ClipboardCheck size={15} style={{ color: allDone ? '#16A34A' : '#D97706' }} />
          Publishing Checklist
        </h3>
        <span style={{ fontSize: 13, color: allDone ? '#16A34A' : 'var(--muted)', fontWeight: allDone ? 700 : 400 }}>
          {done}/{total} {allDone ? 'Complete' : 'done'}
        </span>
      </div>

      <div style={{ height: 3, background: '#E8E8E8', borderRadius: 999, margin: '10px 0 14px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: allDone ? '#16A34A' : '#D97706', borderRadius: 999, transition: 'width 0.3s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {PUBLISH_ITEMS.map(({ key, label }, idx) => (
          <div
            key={key}
            onClick={() => toggle(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0',
              borderBottom: idx < PUBLISH_ITEMS.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              cursor: isClient ? 'default' : 'pointer',
            }}
          >
            <div style={{
              width: 17, height: 17, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${checklist[key] ? '#16A34A' : 'rgba(0,0,0,0.2)'}`,
              background: checklist[key] ? '#16A34A' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s',
            }}>
              {checklist[key] && (
                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                  <path d="M1 3.5L3.5 6L8 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{
              fontSize: 13, flex: 1,
              textDecoration: checklist[key] ? 'line-through' : 'none',
              color: checklist[key] ? 'var(--muted)' : 'var(--text)',
              transition: 'color 0.12s',
            }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {!isClient && (
        <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--muted)' }}>
          Check each item as you complete it. Progress is saved automatically.
        </p>
      )}
    </div>
  );
}

/* ═══ AI Caption Button ═══════════════════════════════════════════════════ */
function AICaptionButton({ post, onInsert }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function suggest() {
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/ai/caption', {
        title: post.title, clientName: post.client?.name,
        platforms: post.platforms, contentType: post.contentType, notes: post.caption,
      });
      onInsert(data.caption);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'AI suggestion failed.';
      setError(msg);
      setTimeout(() => setError(''), 4000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={suggest} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, background: loading ? '#F0F0F0' : '#F5F5F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 980, padding: '4px 10px', fontSize: 12, fontWeight: 500, color: '#3A3A3A', cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
        <Sparkles size={11} /> {loading ? 'Generating…' : 'AI Suggest'}
      </button>
      {error && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#3A3A3A', whiteSpace: 'normal', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxWidth: 280 }}>
          {error}
        </div>
      )}
    </div>
  );
}

/* ═══ Hashtag Bank ════════════════════════════════════════════════════════ */
function HashtagBank({ clientId, post }) {
  const { data: sets = [], isLoading } = useHashtags(clientId);
  const createSet = useCreateHashtagSet();
  const deleteSet = useDeleteHashtagSet();
  const [newName,  setNewName]  = useState('');
  const [newTags,  setNewTags]  = useState('');
  const [adding,   setAdding]   = useState(false);
  const [copied,   setCopied]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState('');

  function copyTags(set) {
    navigator.clipboard.writeText(set.tags.join(' '));
    setCopied(set.id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim() || !newTags.trim()) return;
    const tags = newTags.split(/[\s,]+/).filter(Boolean).map((t) => t.startsWith('#') ? t : `#${t}`);
    await createSet.mutateAsync({ name: newName.trim(), tags, clientId });
    setNewName(''); setNewTags(''); setAdding(false);
  }

  async function suggestFromPost() {
    if (!post?.caption && !post?.title) return;
    setAiLoading(true); setAiError('');
    try {
      const { data } = await api.post('/ai/hashtags', {
        caption: post.caption, title: post.title,
        platforms: post.platforms, clientName: post.client?.name,
      });
      setNewName(`AI — ${post.title?.slice(0, 20) || 'Suggested'}`);
      setNewTags(data.hashtags.join(' '));
      setAdding(true);
      setAiLoading(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Hashtag suggestion failed.';
      setAiError(msg);
      setAiLoading(false);
      setTimeout(() => setAiError(''), 4000);
    }
  }

  const inputSt = { border: '1px solid rgba(0,0,0,0.12)', borderRadius: 7, padding: '6px 9px', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)', width: '100%' };

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (sets.length > 0 || adding) ? 12 : 8 }}>
        <h3 style={{ margin: 0, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Hash size={13} /> Hashtag Bank
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={suggestFromPost} disabled={aiLoading || (!post?.caption && !post?.title)}
            style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#F5F5F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 980, padding: '2px 8px', fontSize: 10, fontWeight: 500, color: '#3A3A3A', cursor: (post?.caption || post?.title) ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
            title="AI-generate hashtags from this post's content"
          >
            {aiLoading ? <Loader2 size={9} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={9} />}
            AI
          </button>
          <button onClick={() => setAdding((v) => !v)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>
            {adding ? 'Cancel' : '+ Add set'}
          </button>
        </div>
      </div>

      {aiError && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#dc2626' }}>{aiError}</p>}

      {adding && (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: sets.length > 0 ? 12 : 0 }}>
          <input placeholder="Set name" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputSt} />
          <textarea placeholder="#hashtag1 #hashtag2" value={newTags} onChange={(e) => setNewTags(e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical' }} />
          <button type="submit" className="primary-button" style={{ fontSize: 12, alignSelf: 'flex-start' }}>Save set</button>
        </form>
      )}

      {isLoading ? (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Loading…</p>
      ) : sets.length === 0 && !adding ? (
        <p style={{ fontSize: 12, color: 'var(--muted-2)', margin: 0 }}>No hashtag sets yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sets.map((set) => (
            <div key={set.id} style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 8, padding: '9px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{set.name}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => copyTags(set)} style={{ fontSize: 11, fontWeight: 500, color: copied === set.id ? '#111' : 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                    {copied === set.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => deleteSet.mutate(set.id)} style={{ fontSize: 12, color: 'var(--muted-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-2)'; }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {set.tags.slice(0, 8).map((t) => (
                  <span key={t} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 980, background: '#F0F0F0', color: '#6B6B6B' }}>{t}</span>
                ))}
                {set.tags.length > 8 && <span style={{ fontSize: 10, color: 'var(--muted-2)' }}>+{set.tags.length - 8}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══ Activity Log ════════════════════════════════════════════════════════ */
function ActivityLog({ activities }) {
  if (!activities.length) return null;
  return (
    <div className="panel" style={{ padding: 18 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Clock size={13} /> Activity
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {activities.map((a, i) => {
          const cfg  = ACTION_LABELS[a.action] ?? { label: a.action, icon: Activity };
          const Icon = cfg.icon;
          return (
            <div key={a.id} style={{ display: 'flex', gap: 8, paddingBottom: i < activities.length - 1 ? 10 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F0F0F0', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={9} color="#6B6B6B" />
                </div>
                {i < activities.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(0,0,0,0.07)', margin: '2px 0' }} />}
              </div>
              <div style={{ paddingBottom: i < activities.length - 1 ? 2 : 0 }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>
                  {a.user?.name ?? 'System'} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>· {cfg.label}</span>
                </p>
                {a.detail && <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--muted)' }}>{a.detail}</p>}
                <p style={{ margin: '1px 0 0', fontSize: 10, color: 'var(--muted-2)' }}>
                  {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
