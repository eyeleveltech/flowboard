import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight, Plus, Filter, X, Download, Inbox, CalendarDays, Loader2 } from 'lucide-react';
import { usePosts, useUpdatePost } from '@/hooks/usePosts';
import { useClients } from '@/hooks/useClients';
import PlatformBadge from '@/components/PlatformBadge';
import StatusBadge from '@/components/StatusBadge';
import api from '@/lib/api';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_LABELS = {
  IDEA: 'Idea', DRAFT: 'Draft', REVIEW: 'In Review',
  APPROVED: 'Approved', CLIENT_APPROVED: 'Client Approved',
  SCHEDULED: 'Scheduled', PUBLISHED: 'Published', REJECTED: 'Changes Requested',
};
const PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER', 'YOUTUBE'];

/* status dot color for calendar chips */
function statusDotColor(status) {
  return { PUBLISHED: '#111', SCHEDULED: '#555', APPROVED: '#888', CLIENT_APPROVED: '#777', REVIEW: '#ADADAD', DRAFT: '#C8C8C8', IDEA: '#DEDEDE', REJECTED: '#EF4444' }[status] ?? '#E0E0E0';
}

export default function Calendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);
  const isClient = currentUser?.role === 'CLIENT';
  const { data: rawClients = [] } = useClients();
  const clients = rawClients;

  const today = new Date();
  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [clientId,    setClientId]    = useState(isClient ? (currentUser?.clientId ?? '') : (searchParams.get('clientId') ?? ''));
  const [platform,    setPlatform]    = useState('');
  const [status,      setStatus]      = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [showTray,      setShowTray]      = useState(true);
  const [dragError,     setDragError]     = useState('');
  const [showDates,     setShowDates]     = useState(true);
  const [importantDates, setImportantDates] = useState([]);
  const [datesLoading,   setDatesLoading]   = useState(false);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    setDatesLoading(true);
    api.get(`/calendar/important-dates?month=${month + 1}&year=${year}`)
      .then((res) => { setImportantDates(res.data.dates ?? []); })
      .catch(() => {})
      .finally(() => setDatesLoading(false));
  }, [month, year]);

  const from = new Date(Date.UTC(year, month, 1)).toISOString();
  const to   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString();

  const { data: unscheduledData } = usePosts({ unscheduled: 'true', clientId: clientId || undefined, limit: 50 });
  const unscheduledPosts = unscheduledData?.posts ?? [];

  const { data } = usePosts({ from, to, limit: 200, clientId: clientId || undefined, platform: platform || undefined, status: status || undefined });
  const posts = data?.posts ?? [];
  const updatePost = useUpdatePost();

  const firstDay    = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  function getPostsForDay(day) {
    return posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const d = new Date(p.scheduledAt);
      return d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day;
    });
  }

  function getDatesForDay(day) {
    return importantDates.filter((d) => d.day === day);
  }

  const DATE_CATEGORY_COLORS = {
    national:  { bg: '#FEF3C7', dot: '#D97706' },
    festival:  { bg: '#FCE7F3', dot: '#DB2777' },
    global:    { bg: '#EDE9FE', dot: '#7C3AED' },
    marketing: { bg: '#DBEAFE', dot: '#2563EB' },
    industry:  { bg: '#D1FAE5', dot: '#059669' },
  };

  function prevMonth() { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); }

  async function onDragEnd(result) {
    const { draggableId: postId, source, destination } = result;
    setDragError('');
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (!destination.droppableId.startsWith('day-')) return;
    const day = Number(destination.droppableId.replace('day-', ''));
    if (!day || isNaN(day)) return;

    const post = [...posts, ...unscheduledPosts].find((p) => p.id === postId);
    if (!post) return;

    const existing = post.scheduledAt ? new Date(post.scheduledAt) : new Date();
    const newDate  = new Date(year, month, day, existing.getHours(), existing.getMinutes());

    try {
      await updatePost.mutateAsync({ id: postId, scheduledAt: newDate.toISOString() });
      dragMovedRef.current = true;
      setTimeout(() => { dragMovedRef.current = false; }, 100);
    } catch {
      setDragError('Failed to reschedule. Try again.');
      setTimeout(() => setDragError(''), 3000);
    }
  }

  function exportCalendar() {
    const clientLabel = clientId ? (clients.find((c) => c.id === clientId)?.name ?? 'All') : 'All Clients';
    const grid = Array.from({ length: firstDay }).map(() => '<div class="day empty"></div>').join('') +
      Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
        const dp = posts.filter((p) => { const dt = new Date(p.scheduledAt); return dt.getUTCDate() === d && dt.getUTCMonth() === month && dt.getUTCFullYear() === year; });
        return `<div class="day"><div class="day-num">${d}</div>${dp.map((p) => `<div class="post">${p.title}</div>`).join('')}</div>`;
      }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Content Calendar — ${MONTHS[month]} ${year}</title>
<style>body{font-family:-apple-system,sans-serif;max-width:1000px;margin:0 auto;padding:24px;color:#111}h1{font-size:22px}.sub{color:#6B6B6B;font-size:13px;margin-bottom:24px}.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#e0e0e0;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden}.day-header{background:#f5f5f5;padding:8px;text-align:center;font-size:11px;font-weight:700;color:#6B6B6B;text-transform:uppercase}.day{background:#fff;padding:8px;min-height:80px}.day-num{font-size:12px;font-weight:600;margin-bottom:4px}.post{background:#F0F0F0;border-radius:4px;padding:3px 6px;margin-bottom:2px;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.empty{background:#fafafa}</style>
</head><body><h1>${MONTHS[month]} ${year} — Content Calendar</h1>
<div class="sub">${clientLabel} · Generated ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div>
<div class="grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d)=>`<div class="day-header">${d}</div>`).join('')}${grid}</div></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const hasFilters = platform || status;

  /* sorted month list — by scheduledAt asc */
  const monthListPosts = [...posts].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p className="eyebrow">Content Planning</p>
          <h2 style={{ margin: 0 }}>Calendar</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} className="secondary-button" style={{ padding: '7px 10px' }}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontWeight: 600, minWidth: 140, textAlign: 'center', fontSize: 15 }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="secondary-button" style={{ padding: '7px 10px' }}>
            <ChevronRight size={15} />
          </button>

          <div style={{ width: 1, height: 20, background: 'var(--panel-border)', margin: '0 2px' }} />

          <button onClick={() => setShowFilters((v) => !v)} className="secondary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Filter size={13} /> Filters
            {hasFilters && (
              <span style={{ background: '#111', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {[platform, status].filter(Boolean).length}
              </span>
            )}
          </button>
          <button onClick={exportCalendar} className="secondary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Download size={13} /> Export
          </button>
          <button onClick={() => setShowTray((v) => !v)} className="secondary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Inbox size={13} />
            Tray
            {unscheduledPosts.length > 0 && (
              <span style={{ background: '#111', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, paddingInline: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unscheduledPosts.length}
              </span>
            )}
          </button>
          {!isClient && (
            <button className="primary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => navigate('/posts/new')}>
              <Plus size={14} /> New Post
            </button>
          )}
        </div>
      </div>

      {/* ── Filter panel ── */}
      {showFilters && (
        <div className="panel" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                style={{ background: 'var(--panel)', border: '1px solid rgba(0,0,0,0.12)', color: 'var(--text)', borderRadius: 8, padding: '7px 11px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="">All platforms</option>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                style={{ background: 'var(--panel)', border: '1px solid rgba(0,0,0,0.12)', color: 'var(--text)', borderRadius: 8, padding: '7px 11px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button onClick={() => { setPlatform(''); setStatus(''); }} className="secondary-button" style={{ fontSize: 12, alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Client color pills — hidden for CLIENT role (auto-locked to their brand) ── */}
      {!isClient && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setClientId('')}
            style={{
              padding: '5px 13px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${!clientId ? '#111' : 'rgba(0,0,0,0.1)'}`,
              background: !clientId ? '#111' : 'transparent',
              color: !clientId ? '#fff' : 'var(--muted)', fontWeight: !clientId ? 600 : 400,
            }}
          >
            All clients
          </button>
          {clients.map((c) => {
            const color   = c.color || '#111111';
            const active  = clientId === c.id;
            return (
              <button key={c.id} onClick={() => setClientId(active ? '' : c.id)}
                style={{
                  padding: '5px 12px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${active ? color : 'rgba(0,0,0,0.1)'}`,
                  background: active ? `${color}18` : 'transparent',
                  color: active ? color : 'var(--muted)', fontWeight: active ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.1s',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                {c.name}
              </button>
            );
          })}
          <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4 }}>
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {dragError && (
        <div style={{ padding: '8px 14px', background: '#F0F0F0', borderRadius: 8, fontSize: 13, color: '#3A3A3A' }}>
          {dragError}
        </div>
      )}

      {/* ── Calendar grid + tray ── */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

          {/* Calendar grid */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Day header row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--panel-border)', background: '#FAFBFC' }}>
                {DAYS.map((d) => (
                  <div key={d} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {cells.map((day, i) => {
                  const dayPosts = day ? getPostsForDay(day) : [];
                  const isToday  = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                  const isLast   = i >= cells.length - 7;

                  return (
                    <Droppable key={day ? `day-${day}` : `empty-${i}`} droppableId={day ? `day-${day}` : `empty-${i}`} isDropDisabled={!day}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            minHeight: 90,
                            padding: '6px 5px',
                            borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--panel-border)' : 'none',
                            borderBottom: !isLast ? '1px solid var(--panel-border)' : 'none',
                            background: snapshot.isDraggingOver ? '#F0F0F0' : day ? 'transparent' : '#FAFBFC',
                            transition: 'background 0.1s',
                          }}
                        >
                          {day && (() => {
                            const dayImportantDates = getDatesForDay(day);
                            return (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                <div style={{
                                  width: 22, height: 22, borderRadius: '50%',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 11, fontWeight: isToday ? 700 : 400,
                                  background: isToday ? '#111111' : 'transparent',
                                  color: isToday ? '#fff' : 'var(--text)',
                                }}>
                                  {day}
                                </div>
                                <button
                                  onClick={() => {
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    navigate(`/posts/new?date=${dateStr}${clientId ? `&clientId=${clientId}` : ''}`);
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-2)', padding: 0, lineHeight: 1, opacity: 0, transition: 'opacity 0.1s' }}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                                >
                                  <Plus size={12} />
                                </button>
                              </div>

                              {/* Important date dots */}
                              {dayImportantDates.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 3 }}>
                                  {dayImportantDates.slice(0, 3).map((d, di) => {
                                    const colors = DATE_CATEGORY_COLORS[d.category] ?? DATE_CATEGORY_COLORS.global;
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    return (
                                      <button key={di} type="button" title={`${d.title} — click to create post`}
                                        onClick={(e) => { e.stopPropagation(); navigate(`/posts/new?date=${dateStr}${clientId ? `&clientId=${clientId}` : ''}`); }}
                                        style={{
                                          fontSize: 9, padding: '1px 5px', borderRadius: 980,
                                          background: colors.bg, color: colors.dot,
                                          fontWeight: 600, lineHeight: 1.6, cursor: 'pointer',
                                          maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                          border: 'none', fontFamily: 'inherit',
                                        }}
                                      >
                                        {d.title}
                                      </button>
                                    );
                                  })}
                                  {dayImportantDates.length > 3 && (
                                    <span style={{ fontSize: 9, color: 'var(--muted-2)', cursor: 'default' }}>+{dayImportantDates.length - 3}</span>
                                  )}
                                </div>
                              )}

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {dayPosts.map((p, idx) => {
                                  const color = p.client?.color || '#111111';
                                  return (
                                    <Draggable key={p.id} draggableId={p.id} index={idx}>
                                      {(drag, dragSnap) => (
                                        <div
                                          ref={drag.innerRef}
                                          {...drag.draggableProps}
                                          {...drag.dragHandleProps}
                                          onClick={() => { if (!dragMovedRef.current) navigate(`/posts/${p.id}`); }}
                                          style={{
                                            background: dragSnap.isDragging ? '#fff' : `${color}0D`,
                                            border: `1px solid ${color}30`,
                                            borderLeft: `3px solid ${color}`,
                                            borderRadius: 5,
                                            padding: '3px 5px 3px 5px',
                                            fontSize: 10,
                                            color: '#3A3A3A',
                                            cursor: dragSnap.isDragging ? 'grabbing' : 'grab',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            boxShadow: dragSnap.isDragging ? '0 6px 16px rgba(0,0,0,0.14)' : 'none',
                                            userSelect: 'none',
                                            ...drag.draggableProps.style,
                                          }}
                                        >
                                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                            {p.title}
                                          </span>
                                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusDotColor(p.status), flexShrink: 0 }} />
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                              </div>
                            </>
                            );
                          })()}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Unscheduled tray */}
          {showTray && (
            <div style={{ width: 210, flexShrink: 0 }}>
              <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#FAFAFA' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Inbox size={12} /> Unscheduled ({unscheduledPosts.length})
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>Drag onto a day to schedule</p>
                </div>
                <Droppable droppableId="unscheduled-tray">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ padding: '8px 10px', minHeight: 100, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {unscheduledPosts.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--muted-2)', textAlign: 'center', padding: '14px 0', margin: 0 }}>All posts are scheduled</p>
                      ) : (
                        unscheduledPosts.map((p, idx) => {
                          const color = p.client?.color || '#111111';
                          return (
                            <Draggable key={p.id} draggableId={p.id} index={idx}>
                              {(drag, dragSnap) => (
                                <div
                                  ref={drag.innerRef}
                                  {...drag.draggableProps}
                                  {...drag.dragHandleProps}
                                  onClick={() => { if (!dragMovedRef.current) navigate(`/posts/${p.id}`); }}
                                  style={{
                                    background: dragSnap.isDragging ? '#fff' : `${color}0D`,
                                    border: `1px solid ${color}25`,
                                    borderLeft: `3px solid ${color}`,
                                    borderRadius: 7,
                                    padding: '7px 9px',
                                    cursor: dragSnap.isDragging ? 'grabbing' : 'grab',
                                    boxShadow: dragSnap.isDragging ? '0 6px 16px rgba(0,0,0,0.14)' : 'none',
                                    ...drag.draggableProps.style,
                                  }}
                                >
                                  <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#3A3A3A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                                    <p style={{ margin: 0, fontSize: 10, color: '#6B6B6B' }}>{p.client?.name}</p>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusDotColor(p.status) }} />
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              {/* Status legend */}
              <div className="panel" style={{ padding: '12px 14px', marginTop: 10 }}>
                <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status key</p>
                {[
                  { label: 'Published',   color: '#111' },
                  { label: 'Scheduled',   color: '#555' },
                  { label: 'Approved',    color: '#888' },
                  { label: 'In Review',   color: '#ADADAD' },
                  { label: 'Draft',       color: '#C8C8C8' },
                  { label: 'Idea',        color: '#DEDEDE' },
                ].map(({ label, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, border: color === '#DEDEDE' ? '1px solid #ccc' : 'none', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Key Dates panel */}
              <div className="panel" style={{ padding: 0, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CalendarDays size={12} /> Key Dates {datesLoading && <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} />}
                  </p>
                  <button onClick={() => setShowDates((v) => !v)} style={{ background: 'none', border: 'none', fontSize: 10, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                    {showDates ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showDates && (
                  <div style={{ maxHeight: 320, overflowY: 'auto', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {importantDates.length === 0 && !datesLoading && (
                      <p style={{ fontSize: 11, color: 'var(--muted-2)', textAlign: 'center', padding: '12px 0', margin: 0 }}>No key dates this month</p>
                    )}
                    {importantDates.map((d, i) => {
                      const colors = DATE_CATEGORY_COLORS[d.category] ?? DATE_CATEGORY_COLORS.global;
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
                      return (
                        <div key={i} style={{ padding: '7px 9px', background: colors.bg + '66', borderRadius: 7, borderLeft: `3px solid ${colors.dot}` }}>
                          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: colors.dot, lineHeight: 1.3 }}>
                            {d.title}
                          </p>
                          <p style={{ margin: '0 0 4px', fontSize: 10, color: '#6B6B6B', lineHeight: 1.3 }}>
                            {MONTHS[month]} {d.day} · {d.category.charAt(0).toUpperCase() + d.category.slice(1)}
                          </p>
                          {d.postAngle && (
                            <p style={{ margin: '0 0 5px', fontSize: 10, color: '#6B6B6B', lineHeight: 1.4, fontStyle: 'italic' }}>{d.postAngle}</p>
                          )}
                          <button
                            onClick={() => navigate(`/posts/new?date=${dateStr}${clientId ? `&clientId=${clientId}` : ''}`)}
                            style={{ background: colors.dot, border: 'none', color: '#fff', borderRadius: 5, padding: '3px 8px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                          >
                            + Create post
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </DragDropContext>

      {/* ── Scheduled list ── */}
      {monthListPosts.length > 0 && (
        <div className="panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 15 }}>
            {(platform || status || clientId) ? 'Filtered posts' : 'This month'} · {monthListPosts.length}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {monthListPosts.map((p, i) => {
              const color = p.client?.color || '#3A3A3A';
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/posts/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < monthListPosts.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFAFA'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ width: 3, height: 32, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 60, fontWeight: 500, flexShrink: 0 }}>
                    {p.scheduledAt
                      ? new Date(p.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                      : '—'}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 90, textAlign: 'right', flexShrink: 0 }}>
                    {p.client?.name}
                  </span>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {(p.platforms ?? []).slice(0, 2).map((pl) => <PlatformBadge key={pl} platform={pl} />)}
                    {(p.platforms ?? []).length > 2 && <span style={{ fontSize: 10, color: 'var(--muted)', alignSelf: 'center' }}>+{p.platforms.length - 2}</span>}
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* inject spin animation if not already in global styles */
const _calStyle = document.createElement('style');
_calStyle.textContent = '@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }';
if (!document.head.querySelector('[data-cal-spin]')) {
  _calStyle.setAttribute('data-cal-spin', '1');
  document.head.appendChild(_calStyle);
}
