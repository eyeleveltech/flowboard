import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, RotateCcw, Eye, Clock, AlertCircle, Send, UserCheck, CheckCheck, ArrowRight, ChevronRight, Filter, X, CalendarDays } from 'lucide-react';
import { usePosts, useUpdatePost } from '@/hooks/usePosts';
import { useClients } from '@/hooks/useClients';
import { useAuthStore } from '@/stores/authStore';
import { SkeletonCard } from '@/components/Skeleton';
import StatusBadge from '@/components/StatusBadge';
import PlatformBadge from '@/components/PlatformBadge';

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function isUrgent(post) {
  if (!post.scheduledAt) return false;
  const h = (new Date(post.scheduledAt).getTime() - Date.now()) / 3600000;
  return h < 48 && h > 0;
}

const TABS = [
  { id: 'submit',  label: 'Ready to Submit',   statuses: ['IDEA', 'DRAFT'],        icon: Send },
  { id: 'review',  label: 'Internal Review',    statuses: ['REVIEW'],               icon: Eye },
  { id: 'client',  label: 'Client Approval',    statuses: ['APPROVED'],             icon: UserCheck },
  { id: 'done',    label: 'Approved',           statuses: ['CLIENT_APPROVED', 'SCHEDULED', 'PUBLISHED'], icon: CheckCheck },
];

function PostCard({ post, tab, onAction, isPending, navigate, isUser, canClientApprove }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [clientName, setClientName] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const urgent = isUrgent(post);
  const days = daysSince(post.updatedAt);

  const checklistDone = post.checklistItems?.filter((i) => i.completed).length ?? 0;
  const checklistTotal = post.checklistItems?.length ?? 0;
  const checklistPct = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;

  return (
    <div
      className="panel"
      style={{
        padding: 0,
        overflow: 'hidden',
        borderColor: urgent ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)',
      }}
    >
      {/* Urgent strip */}
      {urgent && (
        <div style={{ padding: '6px 18px', background: '#111111', display: 'flex', alignItems: 'center', gap: 7 }}>
          <AlertCircle size={13} color="#fff" />
          <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, letterSpacing: '-0.1px' }}>
            Scheduled within 48 hours
          </span>
        </div>
      )}

      <div style={{ padding: '16px 18px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <button
              onClick={() => navigate(`/posts/${post.id}`)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontSize: 15, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.3px', lineHeight: 1.3 }}
            >
              {post.title}
            </button>
            <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{post.client?.name}</span>
              <span style={{ color: 'var(--muted-2)', fontSize: 11 }}>·</span>
              {(post.platforms ?? []).map((p) => <PlatformBadge key={p} platform={p} />)}
              {post.contentType && (
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 980, background: '#F0F0F0', color: '#6B6B6B', border: '1px solid rgba(0,0,0,0.08)' }}>
                  {post.contentType.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <StatusBadge status={post.status} />
            <span style={{ fontSize: 11, color: 'var(--muted-2)' }}>
              {days === 0 ? 'Updated today' : `${days}d ago`}
            </span>
          </div>
        </div>

        {/* Caption preview */}
        {post.caption && (
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.55, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {post.caption}
          </p>
        )}

        {/* Checklist progress bar */}
        {checklistTotal > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#EBEBEB', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${checklistPct}%`, background: '#111111', borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{checklistDone}/{checklistTotal} tasks</span>
          </div>
        )}

        {/* Scheduled date */}
        {post.scheduledAt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
            <Clock size={11} color={urgent ? '#111111' : 'var(--muted)' } />
            <span style={{ fontSize: 12, color: urgent ? '#111111' : 'var(--muted)', fontWeight: urgent ? 600 : 400 }}>
              {new Date(post.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Rejection note (from previous cycle) */}
        {post.rejectionReason && tab !== 'submit' && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#F8F8F8', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#3A3A3A', lineHeight: 1.5 }}>
              <strong>Feedback:</strong> {post.rejectionReason}
            </p>
          </div>
        )}

        {/* Client-approved info */}
        {post.clientApprovedBy && (
          <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <UserCheck size={11} color="var(--muted)" />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Approved by {post.clientApprovedBy}
              {post.clientApprovedAt ? ` on ${new Date(post.clientApprovedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
            </span>
          </div>
        )}

        {/* Rejection textarea */}
        {rejectOpen && (
          <div style={{ marginBottom: 10 }}>
            <textarea
              placeholder="Describe what needs to change... (required)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                background: '#FAFAFA',
                border: '1px solid rgba(0,0,0,0.16)',
                borderRadius: 8,
                padding: '8px 11px',
                fontSize: 13,
                color: 'var(--text)',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}

        {/* Client name input for client approval */}
        {tab === 'client' && !rejectOpen && (
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Client's name (optional)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              style={{
                width: '100%',
                background: '#FAFAFA',
                border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 8,
                padding: '7px 11px',
                fontSize: 13,
                color: 'var(--text)',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tab === 'submit' && !rejectOpen && (
            <>
              <button
                onClick={() => onAction(post, 'submit_review')}
                disabled={isPending}
                className="primary-button"
                style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <Send size={12} /> Submit for Review
              </button>
              <button onClick={() => navigate(`/posts/${post.id}`)} className="secondary-button" style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Eye size={12} /> View
              </button>
            </>
          )}

          {tab === 'review' && !rejectOpen && (
            <>
              {!isUser && (
                <>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      title="Optionally set a schedule date when approving"
                      style={{
                        background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 8, padding: '5px 10px', fontSize: 12,
                        color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => onAction(post, 'internal_approve', { scheduledAt: scheduleDate || undefined })}
                      disabled={isPending}
                      className="primary-button"
                      style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      <CheckCircle size={12} /> Approve
                    </button>
                  </div>
                  <button
                    onClick={() => setRejectOpen(true)}
                    disabled={isPending}
                    className="secondary-button"
                    style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <RotateCcw size={12} /> Request Changes
                  </button>
                </>
              )}
              <button onClick={() => navigate(`/posts/${post.id}`)} className="secondary-button" style={{ fontSize: 12, padding: '6px 14px' }}>
                <Eye size={12} />
              </button>
            </>
          )}

          {tab === 'client' && !rejectOpen && (
            <>
              {canClientApprove && (
                <>
                  <button
                    onClick={() => onAction(post, 'client_approve')}
                    disabled={isPending}
                    className="primary-button"
                    style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <UserCheck size={12} /> Mark Client Approved
                  </button>
                  <button
                    onClick={() => setRejectOpen(true)}
                    disabled={isPending}
                    className="secondary-button"
                    style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <RotateCcw size={12} /> Client Requests Changes
                  </button>
                </>
              )}
              <button onClick={() => navigate(`/posts/${post.id}`)} className="secondary-button" style={{ fontSize: 12, padding: '6px 14px' }}>
                <Eye size={12} />
              </button>
            </>
          )}

          {rejectOpen && (
            <>
              <button
                onClick={() => {
                  if (!rejectNote.trim()) return;
                  onAction(post, tab === 'client' ? 'client_reject' : 'internal_reject', { rejectionReason: rejectNote });
                  setRejectOpen(false);
                  setRejectNote('');
                }}
                disabled={isPending || !rejectNote.trim()}
                style={{
                  padding: '6px 14px', borderRadius: 980, border: 'none',
                  background: '#111111', color: '#fff', fontWeight: 600, fontSize: 12,
                  cursor: rejectNote.trim() ? 'pointer' : 'not-allowed', opacity: rejectNote.trim() ? 1 : 0.5,
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <RotateCcw size={12} /> Send Back
              </button>
              <button onClick={() => { setRejectOpen(false); setRejectNote(''); }} className="secondary-button" style={{ fontSize: 12, padding: '6px 14px' }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Approvals() {
  const navigate = useNavigate();

  const currentUser = useAuthStore((s) => s.user);
  const isClient    = currentUser?.role === 'CLIENT';
  const isUser      = currentUser?.role === 'USER';
  const { data: clients = [] } = useClients();
  const defaultTab  = isClient ? 'client'
    : ['ADMIN_MANAGER', 'MANAGER'].includes(currentUser?.role) ? 'review'
    : 'submit';
  const [activeTab,     setActiveTab]     = useState(defaultTab);
  const [clientId,      setClientId]      = useState(isClient ? (currentUser?.clientId ?? '') : '');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [doneSubStatus, setDoneSubStatus] = useState('');
  const updatePost = useUpdatePost();

  const currentTab = TABS.find((t) => t.id === activeTab);

  const dateFilters = {
    from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    to:   dateTo   ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
  };

  const base = { clientId: clientId || undefined, limit: 200, ...dateFilters };
  const reviewData       = usePosts({ ...base, status: 'REVIEW' });
  const ideaData         = usePosts({ ...base, status: 'IDEA' });
  const draftData        = usePosts({ ...base, status: 'DRAFT' });
  const approvedData     = usePosts({ ...base, status: 'APPROVED' });
  const clientApprData   = usePosts({ ...base, status: 'CLIENT_APPROVED' });
  const scheduledData    = usePosts({ ...base, status: 'SCHEDULED' });
  const publishedData    = usePosts({ ...base, status: 'PUBLISHED' });

  const reviewPosts   = reviewData.data?.posts ?? [];
  const submitPosts   = [...(ideaData.data?.posts ?? []), ...(draftData.data?.posts ?? [])];
  const approvedPosts = approvedData.data?.posts ?? [];
  const allDonePosts  = [...(clientApprData.data?.posts ?? []), ...(scheduledData.data?.posts ?? []), ...(publishedData.data?.posts ?? [])];
  const donePosts     = doneSubStatus ? allDonePosts.filter((p) => p.status === doneSubStatus) : allDonePosts;

  const countMap = {
    submit: submitPosts.length,
    review: reviewPosts.length,
    client: approvedPosts.length,
    done:   allDonePosts.length,
  };

  function getActivePosts() {
    if (activeTab === 'submit')  return submitPosts;
    if (activeTab === 'review')  return reviewPosts;
    if (activeTab === 'client')  return approvedPosts;
    if (activeTab === 'done')    return donePosts;
    return [];
  }

  const canClientApprove = ['SUPER_ADMIN', 'ADMIN', 'CLIENT'].includes(currentUser?.role);

  async function handleAction(post, action, extra = {}) {
    const now = new Date().toISOString();
    const approvedByName = currentUser?.name ?? 'Unknown';
    const updates = {
      submit_review:   { status: 'REVIEW' },
      internal_approve:{ status: 'APPROVED', rejectionReason: null, ...(extra.scheduledAt ? { scheduledAt: new Date(extra.scheduledAt).toISOString() } : {}) },
      internal_reject: { status: 'DRAFT',    rejectionReason: extra.rejectionReason },
      client_approve:  { status: 'CLIENT_APPROVED', clientApprovedBy: approvedByName, clientApprovedAt: now },
      client_reject:   { status: 'DRAFT', rejectionReason: extra.rejectionReason },
    }[action];

    if (updates) {
      await updatePost.mutateAsync({ id: post.id, ...updates });
    }
  }

  const activePosts = getActivePosts();
  const isLoading = reviewData.isLoading || ideaData.isLoading || approvedData.isLoading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div>
        <p className="eyebrow">Workflow</p>
        <h2 style={{ margin: 0 }}>Approvals</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>
          {isClient
            ? 'Posts your team has sent for your sign-off.'
            : 'Move posts through the approval chain before they go live.'}
        </p>
      </div>

      {/* Client color pills — admin only */}
      {!isClient && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setClientId('')}
            style={{ padding: '5px 13px', borderRadius: 980, fontSize: 12, cursor: 'pointer', border: `1px solid ${!clientId ? '#111' : 'rgba(0,0,0,0.1)'}`, background: !clientId ? '#111' : 'transparent', color: !clientId ? '#fff' : 'var(--muted)', fontWeight: !clientId ? 600 : 400 }}
          >
            All clients
          </button>
          {clients.map((c) => {
            const color = c.color || '#111111';
            const active = clientId === c.id;
            return (
              <button key={c.id} onClick={() => setClientId(active ? '' : c.id)}
                style={{ padding: '5px 12px', borderRadius: 980, fontSize: 12, cursor: 'pointer', border: `1px solid ${active ? color : 'rgba(0,0,0,0.1)'}`, background: active ? `${color}18` : 'transparent', color: active ? color : 'var(--muted)', fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.1s' }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Date + sub-stage filters */}
      {!isClient && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowFilters((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${(showFilters || dateFrom || dateTo) ? '#111' : 'rgba(0,0,0,0.12)'}`,
              background: (showFilters || dateFrom || dateTo) ? '#111' : 'var(--panel)',
              color: (showFilters || dateFrom || dateTo) ? '#fff' : 'var(--muted)',
              fontFamily: 'inherit', fontWeight: (dateFrom || dateTo) ? 600 : 400,
            }}
          >
            <Filter size={12} />
            {dateFrom || dateTo ? 'Date filter active' : 'Filter by date'}
          </button>

          {showFilters && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={12} style={{ color: 'var(--muted)' }} />
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>FROM</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{
                    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 7,
                    padding: '5px 10px', fontSize: 12, color: 'var(--text)',
                    background: 'var(--panel)', fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TO</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{
                    border: '1px solid rgba(0,0,0,0.12)', borderRadius: 7,
                    padding: '5px 10px', fontSize: 12, color: 'var(--text)',
                    background: 'var(--panel)', fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(0,0,0,0.1)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--muted)', fontFamily: 'inherit' }}
                >
                  <X size={11} /> Clear dates
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Approval pipeline diagram — admin only */}
      {!isClient && (
        <div className="panel" style={{ padding: '14px 18px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Approval Pipeline</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
            {[
              { label: 'Draft', sub: 'Content created', count: countMap.submit },
              { label: 'Internal Review', sub: 'Team approval', count: countMap.review },
              { label: 'Client Approval', sub: 'Client sign-off', count: countMap.client },
              { label: 'Approved', sub: 'Ready to schedule', count: countMap.done },
            ].map((stage, i, arr) => (
              <div key={stage.label} style={{ display: 'flex', alignItems: 'center', flex: '1 1 auto', minWidth: 100 }}>
                <div
                  onClick={() => setActiveTab(['submit', 'review', 'client', 'done'][i])}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 10,
                    background: activeTab === ['submit', 'review', 'client', 'done'][i] ? '#111111' : '#F5F5F5',
                    cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 700, color: activeTab === ['submit', 'review', 'client', 'done'][i] ? '#fff' : '#111111', lineHeight: 1 }}>{stage.count}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: activeTab === ['submit', 'review', 'client', 'done'][i] ? 'rgba(255,255,255,0.9)' : '#3A3A3A', marginTop: 2 }}>{stage.label}</div>
                  <div style={{ fontSize: 10, color: activeTab === ['submit', 'review', 'client', 'done'][i] ? 'rgba(255,255,255,0.65)' : 'var(--muted)', marginTop: 1 }}>{stage.sub}</div>
                </div>
                {i < arr.length - 1 && <ChevronRight size={16} style={{ color: 'var(--muted-2)', flexShrink: 0, margin: '0 2px' }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab bar — full for admins, single-tab for clients */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 0 }}>
        {(isClient ? TABS.filter((t) => t.id === 'client') : TABS).map((tab) => {
          const { icon: Icon } = tab;
          const count = countMap[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', background: 'none', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #111111' : '2px solid transparent',
                color: activeTab === tab.id ? '#111111' : 'var(--muted)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1,
              }}
            >
              <Icon size={13} strokeWidth={2} />
              {isClient ? 'Pending your approval' : tab.label}
              {count > 0 && (
                <span style={{
                  background: activeTab === tab.id ? '#111111' : '#EBEBEB',
                  color: activeTab === tab.id ? '#fff' : '#6B6B6B',
                  borderRadius: 999, fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', minWidth: 18, textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-status filter — only in Done tab */}
      {activeTab === 'done' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { value: '',               label: 'All approved' },
            { value: 'CLIENT_APPROVED', label: 'Client approved' },
            { value: 'SCHEDULED',       label: 'Scheduled' },
            { value: 'PUBLISHED',       label: 'Published' },
          ].map(({ value, label }) => {
            const count = value
              ? allDonePosts.filter((p) => p.status === value).length
              : allDonePosts.length;
            const active = doneSubStatus === value;
            return (
              <button
                key={value || 'all'}
                onClick={() => setDoneSubStatus(value)}
                style={{
                  padding: '5px 12px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${active ? '#111' : 'rgba(0,0,0,0.1)'}`,
                  background: active ? '#111' : 'transparent',
                  color: active ? '#fff' : 'var(--muted)',
                  fontWeight: active ? 600 : 400,
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {label}
                {count > 0 && (
                  <span style={{ background: active ? 'rgba(255,255,255,0.2)' : '#EBEBEB', color: active ? '#fff' : '#6B6B6B', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 5px' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Post list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map((i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : activePosts.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <CheckCheck size={28} style={{ color: 'var(--muted-2)', marginBottom: 12 }} />
          <p style={{ fontWeight: 600, color: 'var(--text)', margin: '0 0 5px', fontSize: 15 }}>
            {isClient
              ? 'You are all caught up'
              : activeTab === 'submit' ? 'No drafts ready to submit'
              : activeTab === 'review' ? 'Nothing pending review'
              : activeTab === 'client' ? 'Nothing awaiting client approval'
              : 'No approved posts yet'}
          </p>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>
            {isClient
              ? 'No posts are waiting for your approval right now. Check back later.'
              : activeTab === 'submit'
              ? 'Create a post and it will appear here once it is in draft.'
              : 'Posts will appear here as they move through the pipeline.'}
          </p>
          {!isClient && activeTab === 'submit' && (
            <button
              onClick={() => navigate('/posts/new')}
              className="primary-button"
              style={{ marginTop: 16, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <ArrowRight size={13} /> Create Post
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {activePosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              tab={activeTab}
              onAction={handleAction}
              isPending={updatePost.isPending}
              navigate={navigate}
              isUser={isUser}
              canClientApprove={canClientApprove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
