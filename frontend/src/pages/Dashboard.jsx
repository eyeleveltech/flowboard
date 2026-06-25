import { useNavigate } from 'react-router-dom';
import { Users, Clock, CalendarCheck, FileEdit, AlertCircle, CheckCheck, ArrowRight, CalendarDays, Layers } from 'lucide-react';
import { usePosts } from '@/hooks/usePosts';
import { useClients } from '@/hooks/useClients';
import PostCard from '@/components/PostCard';
import ClientAvatar from '@/components/ClientAvatar';

function getWeekDays() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PIPELINE_STAGES = [
  { key: 'IDEA',      label: 'Idea',      color: '#E8E8E8' },
  { key: 'DRAFT',     label: 'Draft',     color: '#D0D0D0' },
  { key: 'REVIEW',    label: 'In review', color: '#B0B0B0' },
  { key: 'APPROVED',  label: 'Approved',  color: '#888888' },
  { key: 'SCHEDULED', label: 'Scheduled', color: '#555555' },
  { key: 'PUBLISHED', label: 'Published', color: '#111111' },
];

function PipelineFunnel({ counts }) {
  const max = Math.max(...Object.values(counts), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {PIPELINE_STAGES.map(({ key, label, color }) => {
        const count = counts[key] ?? 0;
        const pct   = (count / max) * 100;
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', width: 74, flexShrink: 0, textAlign: 'right' }}>
              {label}
            </span>
            <div style={{ flex: 1, height: 20, background: 'var(--fill)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: color,
                borderRadius: 4,
                transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                minWidth: count > 0 ? 4 : 0,
              }} />
            </div>
            <span style={{
              fontSize: 13, fontWeight: 700, color: count > 0 ? 'var(--text)' : 'var(--muted-2)',
              width: 20, textAlign: 'right', flexShrink: 0,
            }}>
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyOutputChart({ posts }) {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks = [
    { label: 'Wk 1', start: 1,  end: 7 },
    { label: 'Wk 2', start: 8,  end: 14 },
    { label: 'Wk 3', start: 15, end: 21 },
    { label: 'Wk 4', start: 22, end: 28 },
    ...(daysInMonth > 28 ? [{ label: 'Wk 5', start: 29, end: daysInMonth }] : []),
  ];

  const counts = weeks.map(({ start, end }) => {
    return posts.filter((p) => {
      const d = new Date(p.publishedAt ?? p.updatedAt);
      if (d.getFullYear() !== year || d.getMonth() !== month) return false;
      const day = d.getDate();
      return day >= start && day <= end;
    }).length;
  });

  const max     = Math.max(...counts, 1);
  const BAR_H   = 72;
  const total   = counts.reduce((a, b) => a + b, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: BAR_H + 24, paddingBottom: 24, position: 'relative' }}>
        {/* Gridlines */}
        {[0.25, 0.5, 0.75, 1].map((v) => (
          <div key={v} style={{
            position: 'absolute',
            left: 0, right: 0,
            bottom: 24 + v * BAR_H,
            borderTop: '1px dashed rgba(0,0,0,0.07)',
            zIndex: 0,
          }} />
        ))}

        {weeks.map(({ label }, i) => {
          const count = counts[i];
          const barH  = max > 0 ? (count / max) * BAR_H : 0;
          const isCurrentWeek = (() => {
            const d = today.getDate();
            return d >= weeks[i].start && d <= weeks[i].end;
          })();

          return (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, zIndex: 1 }}>
              {count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  {count}
                </span>
              )}
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                <div style={{
                  width: '100%',
                  height: barH || 3,
                  background: isCurrentWeek ? '#111111' : (count > 0 ? '#CCCCCC' : 'var(--fill)'),
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1)',
                }} />
              </div>
              <span style={{
                fontSize: 11, color: isCurrentWeek ? 'var(--text)' : 'var(--muted)',
                fontWeight: isCurrentWeek ? 600 : 400, marginTop: 6,
                position: 'absolute', bottom: 0,
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)', lineHeight: 1 }}>
          {total}
        </span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          posts published this month
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate  = useNavigate();
  const today     = new Date();

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const weekStart  = today.toISOString().split('T')[0] + 'T00:00:00';
  const weekEnd    = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T23:59:59';

  const { data: draftData }      = usePosts({ status: 'DRAFT',     limit: 50 });
  const { data: ideaData }       = usePosts({ status: 'IDEA',      limit: 50 });
  const { data: reviewData }     = usePosts({ status: 'REVIEW',    limit: 20 });
  const { data: scheduledData }  = usePosts({ status: 'SCHEDULED', limit: 100 });
  const { data: approvedData }   = usePosts({ status: 'APPROVED',  limit: 50 });
  const { data: publishedData }  = usePosts({ status: 'PUBLISHED', from: monthStart, to: monthEnd, limit: 200 });
  const { data: weekData }       = usePosts({ from: weekStart, to: weekEnd, limit: 100 });
  const { data: clients }        = useClients();

  const draftPosts          = draftData?.posts    ?? [];
  const ideaPosts           = ideaData?.posts     ?? [];
  const reviewPosts         = reviewData?.posts   ?? [];
  const scheduledAll        = scheduledData?.posts ?? [];
  const approvedUnscheduled = approvedData?.posts ?? [];
  const publishedPosts      = publishedData?.posts ?? [];
  const weekPosts           = weekData?.posts     ?? [];

  const scheduledToday = scheduledAll.filter((p) => isSameDay(new Date(p.scheduledAt), today));
  const overduePosts   = scheduledAll.filter((p) => p.scheduledAt && new Date(p.scheduledAt) < today);
  const weekDays       = getWeekDays();

  const weekDayMap = weekDays.map((day) => ({
    day,
    posts: weekPosts.filter((p) => p.scheduledAt && isSameDay(new Date(p.scheduledAt), day)),
  }));

  const pipelineCounts = {
    IDEA:      ideaData?.total      ?? 0,
    DRAFT:     draftData?.total     ?? 0,
    REVIEW:    reviewData?.total    ?? 0,
    APPROVED:  approvedData?.total  ?? 0,
    SCHEDULED: scheduledData?.total ?? 0,
    PUBLISHED: publishedData?.total ?? 0,
  };

  const metrics = [
    {
      title: 'Active clients',
      value: clients?.length ?? 0,
      note: 'All retainer clients',
      Icon: Users,
      path: '/clients',
    },
    {
      title: 'Pending approvals',
      value: reviewData?.total ?? 0,
      note: reviewPosts[0]?.client?.name
        ? `Oldest: ${reviewPosts[0].client.name}`
        : 'Nothing in review',
      Icon: Clock,
      path: '/approvals',
      urgent: (reviewData?.total ?? 0) > 0,
    },
    {
      title: 'Scheduled today',
      value: scheduledToday.length,
      note: scheduledToday.length === 0 ? 'Clear today' : `${scheduledToday.length} post${scheduledToday.length > 1 ? 's' : ''} going out`,
      Icon: CalendarCheck,
      path: '/calendar',
    },
    {
      title: 'In planning',
      value: (draftData?.total ?? 0) + (ideaData?.total ?? 0),
      note: `${draftData?.total ?? 0} drafts · ${ideaData?.total ?? 0} ideas`,
      Icon: FileEdit,
      path: '/posts',
    },
    {
      title: 'Approved, unscheduled',
      value: approvedData?.total ?? 0,
      note: approvedData?.total ? 'Need a date assigned' : 'All scheduled',
      Icon: Layers,
      path: '/posts',
      urgent: (approvedData?.total ?? 0) > 0,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div>
        <p className="eyebrow">Today</p>
        <h2 style={{ marginBottom: 2 }}>Dashboard</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 0 }}>
          {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Overdue alert */}
      {overduePosts.length > 0 && (
        <div style={{
          background: '#FAFAFA',
          border: '1px solid rgba(0,0,0,0.12)',
          borderLeft: '3px solid #111111',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} strokeWidth={2} style={{ color: 'var(--text)', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>
                {overduePosts.length} overdue post{overduePosts.length > 1 ? 's' : ''}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                Scheduled date passed — not yet published
              </p>
            </div>
          </div>
          <button className="secondary-button" style={{ fontSize: 12 }} onClick={() => navigate('/calendar')}>
            Review
          </button>
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }} className="metrics-grid">
        {metrics.map(({ title, value, note, Icon, path, urgent }) => (
          <article
            key={title}
            className="metric-card"
            onClick={() => navigate(path)}
            style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.22)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--separator)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
            }}
          >
            {urgent && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                width: 7, height: 7, borderRadius: '50%',
                background: '#111111',
              }} />
            )}
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon size={14} strokeWidth={1.8} style={{ color: 'var(--text-2)' }} />
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 500, margin: '0 0 3px', letterSpacing: '-0.1px' }}>{title}</p>
            <p style={{ color: 'var(--text)', fontSize: 28, fontWeight: 700, margin: '0 0 3px', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</p>
            <span style={{ color: 'var(--muted-2)', fontSize: 11 }}>{note}</span>
          </article>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="charts-grid">

        {/* Pipeline funnel */}
        <article className="panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Content pipeline</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Posts at each stage right now</p>
          </div>
          <PipelineFunnel counts={pipelineCounts} />
        </article>

        {/* Monthly output */}
        <article className="panel" style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Monthly output</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
              {today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <MonthlyOutputChart posts={publishedPosts} />
        </article>
      </div>

      {/* This week strip */}
      <article className="panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={15} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
            <h3 style={{ margin: 0 }}>This week</h3>
          </div>
          <button onClick={() => navigate('/calendar')} className="secondary-button" style={{ fontSize: 12 }}>
            Full calendar
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {weekDayMap.map(({ day, posts: dayPosts }) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={day.toISOString()}
                onClick={() => navigate('/calendar')}
                style={{
                  borderRadius: 10,
                  padding: '10px 8px',
                  background: isToday ? '#111111' : 'var(--fill)',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                  textAlign: 'center',
                  minHeight: 80,
                }}
                onMouseEnter={(e) => { if (!isToday) e.currentTarget.style.background = 'var(--fill-hover)'; }}
                onMouseLeave={(e) => { if (!isToday) e.currentTarget.style.background = 'var(--fill)'; }}
              >
                <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: isToday ? 'rgba(255,255,255,0.6)' : 'var(--muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {DAY_LABELS[day.getDay()]}
                </p>
                <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: isToday ? '#fff' : 'var(--text)', letterSpacing: '-0.3px' }}>
                  {day.getDate()}
                </p>
                {dayPosts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                    {dayPosts.slice(0, 2).map((p) => (
                      <div
                        key={p.id}
                        style={{
                          width: '100%', borderRadius: 5, padding: '2px 6px',
                          background: isToday ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.07)',
                          fontSize: 10, fontWeight: 500,
                          color: isToday ? 'rgba(255,255,255,0.85)' : 'var(--text-2)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {p.client?.name ?? p.title}
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <p style={{ margin: 0, fontSize: 10, color: isToday ? 'rgba(255,255,255,0.5)' : 'var(--muted-2)' }}>
                        +{dayPosts.length - 2} more
                      </p>
                    )}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 11, color: isToday ? 'rgba(255,255,255,0.35)' : 'var(--muted-2)' }}>—</p>
                )}
              </div>
            );
          })}
        </div>
      </article>

      {/* Client health */}
      {(clients?.length ?? 0) > 0 && (
        <div>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Clients</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {clients.map((client) => (
              <div
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 40,
                  background: 'var(--panel)',
                  border: '1px solid var(--separator)',
                  cursor: 'pointer', transition: 'border-color 0.12s, box-shadow 0.12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.22)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--separator)'; e.currentTarget.style.boxShadow = ''; }}
              >
                <ClientAvatar client={client} size={22} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                  {client.name}
                </span>
                <ArrowRight size={12} style={{ color: 'var(--muted-2)' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queues */}
      <div className="workspace-grid">

        {/* Planning queue */}
        <article className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>Planning queue</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                {draftPosts.length} draft{draftPosts.length !== 1 ? 's' : ''} · {ideaPosts.length} idea{ideaPosts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button onClick={() => navigate('/posts/new')} className="secondary-button" style={{ fontSize: 12 }}>
              New draft
            </button>
          </div>

          {draftPosts.length === 0 && ideaPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
              No drafts or ideas yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {draftPosts.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Drafts
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {draftPosts.slice(0, 4).map((p) => <PostCard key={p.id} post={p} compact />)}
                    {draftPosts.length > 4 && (
                      <button onClick={() => navigate('/posts')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
                        +{draftPosts.length - 4} more drafts
                      </button>
                    )}
                  </div>
                </div>
              )}
              {ideaPosts.length > 0 && (
                <div>
                  {draftPosts.length > 0 && <div style={{ height: 1, background: 'var(--separator)', margin: '4px 0 10px' }} />}
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Ideas
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ideaPosts.slice(0, 3).map((p) => <PostCard key={p.id} post={p} compact />)}
                    {ideaPosts.length > 3 && (
                      <button onClick={() => navigate('/posts')} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
                        +{ideaPosts.length - 3} more ideas
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </article>

        {/* Approval queue */}
        <article className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>Approval queue</h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                {reviewPosts.length} waiting for review
              </p>
            </div>
            {reviewPosts.length > 5 && (
              <button onClick={() => navigate('/approvals')} className="secondary-button" style={{ fontSize: 12 }}>
                View all
              </button>
            )}
          </div>

          {reviewPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCheck size={22} strokeWidth={1.5} style={{ color: 'var(--muted-2)', marginBottom: 8 }} />
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>Nothing awaiting review.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reviewPosts.slice(0, 5).map((p) => <PostCard key={p.id} post={p} compact />)}
            </div>
          )}

          {approvedUnscheduled.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--separator)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {approvedUnscheduled.length} approved, no date set
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Ready to schedule</p>
                </div>
                <button onClick={() => navigate('/posts')} className="secondary-button" style={{ fontSize: 12 }}>
                  Schedule
                </button>
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
