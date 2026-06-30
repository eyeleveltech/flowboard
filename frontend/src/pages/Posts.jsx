import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  Plus, Filter, X, ChevronDown, Trash2, CheckCircle,
  CalendarClock, UserCheck, RotateCcw, FileText,
  LayoutGrid, List, Search, ArrowUpDown, CalendarOff,
  Upload, Download, PauseCircle, PlayCircle, AlertTriangle,
} from 'lucide-react';
import { usePosts, useCreatePost } from '@/hooks/usePosts';
import api from '@/lib/api';
import { useBulkPosts } from '@/hooks/useBulkPosts';
import { useClients } from '@/hooks/useClients';
import { useUsers } from '@/hooks/useUsers';
import StatusBadge from '@/components/StatusBadge';
import PlatformBadge from '@/components/PlatformBadge';
import PostCard from '@/components/PostCard';
import { SkeletonRow } from '@/components/Skeleton';

/* ─── Constants ─── */
const ALL_STATUSES = ['IDEA', 'DRAFT', 'REVIEW', 'APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PAUSED', 'PUBLISHED', 'REJECTED'];

const STATUS_LABELS = {
  IDEA: 'Idea', DRAFT: 'Draft', REVIEW: 'In Review',
  APPROVED: 'Approved', CLIENT_APPROVED: 'Client Approved',
  SCHEDULED: 'Scheduled', PAUSED: 'Paused', PUBLISHED: 'Published', REJECTED: 'Change Request',
};

const PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER', 'YOUTUBE', 'TIKTOK', 'THREADS', 'BLUESKY'];

const CONTENT_TYPES = ['CAROUSEL', 'REEL', 'STATIC_IMAGE', 'VIDEO', 'STORY', 'THREAD', 'LONG_FORM'];
const CONTENT_TYPE_LABELS = {
  CAROUSEL: 'Carousel', REEL: 'Reel', STATIC_IMAGE: 'Static',
  VIDEO: 'Video', STORY: 'Story', THREAD: 'Thread', LONG_FORM: 'Long-form',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'scheduled', label: 'Scheduled date' },
  { value: 'title', label: 'Title A–Z' },
];

const STATUS_ACTIONS = [
  { label: 'Submit for Review', value: 'REVIEW', icon: RotateCcw },
  { label: 'Approve (Internal)', value: 'APPROVED', icon: CheckCircle },
  { label: 'Mark Client Approved', value: 'CLIENT_APPROVED', icon: UserCheck },
  { label: 'Mark Scheduled', value: 'SCHEDULED', icon: CalendarClock },
  { label: 'Mark Published', value: 'PUBLISHED', icon: CheckCircle },
  { label: 'Move to Draft', value: 'DRAFT', icon: RotateCcw },
];

/* ─── CSV helpers ─── */
const CSV_TEMPLATE_HEADERS = ['title', 'caption', 'client_name', 'platforms', 'content_type', 'scheduled_date', 'status'];

function downloadCsvTemplate() {
  const rows = [
    CSV_TEMPLATE_HEADERS.join(','),
    '"Welcome Post","Excited to launch! Stay tuned.","Da One Sports","INSTAGRAM,LINKEDIN","STATIC_IMAGE","2026-07-01","DRAFT"',
    '"Product Reel","Check out our latest product.","Da One Sports","INSTAGRAM","REEL","","IDEA"',
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'flowboard_import_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).map((line) => {
    const vals = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    vals.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').replace(/"/g, '').trim(); });
    return row;
  });
}

const selectStyle = {
  background: 'var(--panel)', border: '1px solid rgba(0,0,0,0.12)',
  color: 'var(--text)', borderRadius: 8, padding: '7px 11px',
  fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
};

/* ─── Filter chip ─── */
function Chip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 980,
      background: '#111', color: '#fff',
      fontSize: 12, fontWeight: 500,
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1 }}>
        <X size={11} />
      </button>
    </span>
  );
}

/* ─── Main ─── */
export default function Posts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAuthStore((s) => s.user);
  const isClient = currentUser?.role === 'CLIENT';
  const canDelete = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role);
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();

  // Filters
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState(isClient ? (currentUser?.clientId ?? '') : (searchParams.get('clientId') ?? ''));
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [platform, setPlatform] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [contentType, setContentType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [unscheduled, setUnscheduled] = useState(false);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState('table'); // 'table' | 'grid'

  // Bulk
  const [selected, setSelected] = useState(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const bulkRef = useRef(null);

  // CSV Import
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState('');
  const [importStatus, setImportStatus] = useState(null); // null | 'running' | { done, failed }
  const createPost = useCreatePost();

  // Crisis mode
  const [crisisMode, setCrisisMode] = useState(null); // null | 'paused' | 'active'
  const [crisisLoading, setCrisisLoading] = useState(false);
  const [crisisResult, setCrisisResult] = useState(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Close bulk dropdown on outside click
  useEffect(() => {
    if (!bulkMenuOpen) return;
    function handler(e) { if (bulkRef.current && !bulkRef.current.contains(e.target)) setBulkMenuOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bulkMenuOpen]);

  const LIMIT = 30;

  const filters = {
    clientId: clientId || undefined,
    status: status || undefined,
    platform: platform || undefined,
    assignedToId: assignedToId || undefined,
    contentType: contentType || undefined,
    search: debouncedSearch || undefined,
    from: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
    unscheduled: unscheduled ? 'true' : undefined,
    sort,
    page,
    limit: LIMIT,
  };

  const { data, isLoading, isError, refetch } = usePosts(filters);
  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;
  const hasMore = page * LIMIT < total;

  const bulk = useBulkPosts();

  function toggleSelect(id) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(selected.size === posts.length ? new Set() : new Set(posts.map((p) => p.id)));
  }

  function handleCsvFile(e) {
    setImportError('');
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCsv(ev.target.result);
      if (rows.length === 0) { setImportError('No valid rows found. Check the file format.'); return; }
      setImportRows(rows);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function runImport() {
    setImportStatus('running');
    let done = 0, failed = 0;
    for (const row of importRows) {
      try {
        const matchedClient = clients.find((c) => c.name.toLowerCase() === row.client_name?.toLowerCase());
        const platforms = (row.platforms || 'INSTAGRAM').split(',').map((p) => p.trim().toUpperCase()).filter((p) => PLATFORMS.includes(p));
        const status = ALL_STATUSES.includes(row.status?.toUpperCase()) ? row.status.toUpperCase() : 'DRAFT';
        const contentType = CONTENT_TYPES.includes(row.content_type?.toUpperCase()) ? row.content_type.toUpperCase() : undefined;
        const scheduledAt = row.scheduled_date ? new Date(row.scheduled_date).toISOString() : undefined;
        await createPost.mutateAsync({
          title: row.title || 'Untitled',
          caption: row.caption || '',
          clientId: matchedClient?.id || null,
          platforms,
          status,
          ...(contentType && { contentType }),
          ...(scheduledAt && !isNaN(new Date(scheduledAt)) && { scheduledAt }),
        });
        done++;
      } catch { failed++; }
    }
    setImportStatus({ done, failed });
    setImportRows([]);
  }

  async function runCrisis(action) {
    setCrisisLoading(true); setCrisisResult(null);
    try {
      const { data } = await api.post('/posts/crisis', { action });
      setCrisisMode(action === 'pause' ? 'paused' : 'active');
      setCrisisResult(data);
      refetch?.();
    } catch (err) {
      setCrisisResult({ error: err.response?.data?.error || 'Crisis action failed.' });
    } finally {
      setCrisisLoading(false);
    }
  }

  async function bulkAction(action) {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkError('');
    try {
      if (action === 'delete') {
        if (!confirm(`Delete ${ids.length} post${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
        await bulk.mutateAsync({ ids, action: 'delete', data: {} });
      } else {
        await bulk.mutateAsync({ ids, action: 'update', data: { status: action } });
      }
      setSelected(new Set());
      setBulkMenuOpen(false);
    } catch {
      setBulkError('Bulk action failed. Try again.');
    }
  }

  // Chip-based active filters (for display) — CLIENT users can't clear their brand lock
  const chips = [
    (!isClient && clientId) && { key: 'clientId', label: `Client: ${clients.find((c) => c.id === clientId)?.name ?? clientId}`, clear: () => { setClientId(''); setPage(1); } },
    platform && { key: 'platform', label: `Platform: ${platform}`, clear: () => { setPlatform(''); setPage(1); } },
    assignedToId && { key: 'assignedToId', label: `Assignee: ${users.find((u) => u.id === assignedToId)?.name ?? assignedToId}`, clear: () => { setAssignedToId(''); setPage(1); } },
    contentType && { key: 'contentType', label: `Type: ${CONTENT_TYPE_LABELS[contentType] ?? contentType}`, clear: () => { setContentType(''); setPage(1); } },
    dateFrom && { key: 'dateFrom', label: `From: ${dateFrom}`, clear: () => { setDateFrom(''); setPage(1); } },
    dateTo && { key: 'dateTo', label: `To: ${dateTo}`, clear: () => { setDateTo(''); setPage(1); } },
    unscheduled && { key: 'unscheduled', label: 'Unscheduled only', clear: () => { setUnscheduled(false); setPage(1); } },
  ].filter(Boolean);

  const activeFilterCount = chips.length + (status ? 1 : 0) + (debouncedSearch ? 1 : 0);

  function clearAll() {
    setSearch(''); setStatus(''); setPlatform('');
    setAssignedToId(''); setContentType(''); setDateFrom(''); setDateTo('');
    setUnscheduled(false); setPage(1);
    if (!isClient) setClientId('');
  }

  const clientName = clientId ? clients.find((c) => c.id === clientId)?.name : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p className="eyebrow">Content</p>
          <h2 style={{ margin: 0 }}>
            {clientName ? `${clientName}` : 'All Posts'}
            <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>· {total}</span>
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search posts…"
              style={{
                paddingLeft: 32, paddingRight: search ? 28 : 12,
                paddingTop: 7, paddingBottom: 7,
                border: '1px solid var(--panel-border)', borderRadius: 8,
                background: 'var(--panel)', fontSize: 13, color: 'var(--text)',
                fontFamily: 'inherit', outline: 'none', width: search ? 260 : 200,
                transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              onFocus={(e) => {
                e.target.style.width = '260px';
                e.target.style.borderColor = 'var(--text)';
                e.target.style.boxShadow = '0 0 0 1px var(--text)';
              }}
              onBlur={(e) => {
                if (!search) e.target.style.width = '200px';
                e.target.style.borderColor = 'var(--panel-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {search && (
              <button onClick={() => { setSearch(''); setPage(1); }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-2)', display: 'flex', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--panel-border)', borderRadius: 8, overflow: 'hidden', background: 'var(--panel)' }}>
            {[
              { v: 'table', Icon: List },
              { v: 'grid', Icon: LayoutGrid },
            ].map(({ v, Icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '7px 10px', border: 'none', cursor: 'pointer',
                  background: view === v ? '#111' : 'transparent',
                  color: view === v ? '#fff' : 'var(--muted)',
                  transition: 'all 0.12s', display: 'flex', alignItems: 'center',
                }}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpDown size={13} style={{ color: 'var(--muted)' }} />
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} style={{ ...selectStyle, fontSize: 12, padding: '6px 10px' }}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* More filters toggle */}
          <button onClick={() => setShowFilters((v) => !v)} className="secondary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Filter size={13} />
            Filters
            {chips.length > 0 && (
              <span style={{ background: '#111', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {chips.length}
              </span>
            )}
          </button>

          {!isClient && (
            <>
              {/* Crisis mode */}
              {crisisMode === 'paused' ? (
                <button onClick={() => runCrisis('resume')} disabled={crisisLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #15803d', background: '#F0FDF4', color: '#15803d', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                >
                  <PlayCircle size={13} /> {crisisLoading ? 'Resuming…' : 'Resume Scheduled'}
                </button>
              ) : (
                <button onClick={() => runCrisis('pause')} disabled={crisisLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #dc2626', background: '#FEF2F2', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                  title="Pause all scheduled posts immediately (use during a PR crisis)"
                >
                  <PauseCircle size={13} /> {crisisLoading ? 'Pausing…' : 'Crisis Pause'}
                </button>
              )}
              <button onClick={() => { setImportOpen(true); setImportRows([]); setImportError(''); setImportStatus(null); }} className="secondary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Upload size={13} /> Import
              </button>
              <button onClick={() => navigate('/posts/new')} className="primary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={14} /> New Post
              </button>
            </>
          )}
        </div>
      </div>

      {/* Crisis mode result banner */}
      {crisisResult && !crisisResult.error && (
        <div style={{ padding: '10px 16px', background: crisisMode === 'paused' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${crisisMode === 'paused' ? '#FECACA' : '#BBF7D0'}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          {crisisMode === 'paused'
            ? <><PauseCircle size={14} color="#dc2626" /><span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{crisisResult.affected} scheduled post{crisisResult.affected !== 1 ? 's' : ''} paused. Click "Resume Scheduled" to restore them.</span></>
            : <><PlayCircle size={14} color="#15803d" /><span style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>{crisisResult.affected} post{crisisResult.affected !== 1 ? 's' : ''} resumed and back on schedule.</span></>
          }
          <button onClick={() => setCrisisResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginLeft: 'auto' }}><X size={13} /></button>
        </div>
      )}
      {crisisResult?.error && (
        <div style={{ padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} /> {crisisResult.error}
          <button onClick={() => setCrisisResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', marginLeft: 'auto' }}><X size={13} /></button>
        </div>
      )}

      {/* ── Quick status filter pills ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={() => { setStatus(''); setPage(1); }}
          style={{
            padding: '6px 14px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
            border: `1px solid ${!status ? '#111' : 'rgba(0,0,0,0.12)'}`,
            background: !status ? '#111' : 'transparent',
            color: !status ? '#fff' : 'var(--muted)', fontWeight: !status ? 600 : 500,
            transition: 'all 0.15s ease',
          }}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(status === s ? '' : s); setPage(1); }}
            style={{
              padding: '6px 14px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${status === s ? '#111' : 'rgba(0,0,0,0.12)'}`,
              background: status === s ? '#111' : 'transparent',
              color: status === s ? '#fff' : 'var(--muted)', fontWeight: status === s ? 600 : 500,
              transition: 'all 0.15s ease',
            }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}

        {/* Unscheduled toggle */}
        <button
          onClick={() => { setUnscheduled((v) => !v); setPage(1); }}
          style={{
            padding: '6px 14px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
            border: `1px solid ${unscheduled ? '#111' : 'rgba(0,0,0,0.12)'}`,
            background: unscheduled ? '#111' : 'transparent',
            color: unscheduled ? '#fff' : 'var(--muted)', fontWeight: unscheduled ? 600 : 500,
            display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.15s ease',
          }}
        >
          <CalendarOff size={12} /> No date
        </button>
      </div>

      {/* ── Active filter chips ── */}
      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {chips.map((c) => <Chip key={c.key} label={c.label} onRemove={c.clear} />)}
          <button onClick={clearAll} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline' }}>
            Clear all
          </button>
        </div>
      )}

      {/* ── Expanded filter panel ── */}
      {showFilters && (
        <div className="panel" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>

            {[
              !isClient && {
                label: 'Client',
                el: (
                  <select value={clientId} onChange={(e) => { setClientId(e.target.value); setPage(1); }} style={selectStyle}>
                    <option value="">All clients</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ),
              },
              {
                label: 'Platform',
                el: (
                  <select value={platform} onChange={(e) => { setPlatform(e.target.value); setPage(1); }} style={selectStyle}>
                    <option value="">All platforms</option>
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                ),
              },
              {
                label: 'Content type',
                el: (
                  <select value={contentType} onChange={(e) => { setContentType(e.target.value); setPage(1); }} style={selectStyle}>
                    <option value="">Any type</option>
                    {CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
                  </select>
                ),
              },
              {
                label: 'Assignee',
                el: (
                  <select value={assignedToId} onChange={(e) => { setAssignedToId(e.target.value); setPage(1); }} style={selectStyle}>
                    <option value="">Anyone</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                ),
              },
              {
                label: 'From',
                el: <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} style={{ ...selectStyle, width: 148 }} />,
              },
              {
                label: 'To',
                el: <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} style={{ ...selectStyle, width: 148 }} />,
              },
            ].map(({ label, el }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                {el}
              </div>
            ))}

            {chips.length > 0 && (
              <button onClick={clearAll} className="secondary-button" style={{ fontSize: 12, alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 4 }}>
                <X size={12} /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: '#111111', borderRadius: 10, padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{selected.size} selected</span>
          <div style={{ flex: 1 }} />

          <div ref={bulkRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setBulkMenuOpen((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px',
                borderRadius: 980, border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.12)', color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Change Status <ChevronDown size={12} />
            </button>
            {bulkMenuOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4,
                background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
                border: '1px solid rgba(0,0,0,0.1)', padding: '4px 0', minWidth: 210, zIndex: 20,
              }}>
                {STATUS_ACTIONS.map(({ label, value, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => bulkAction(value)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#111111', textAlign: 'left' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#F5F5F5'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <Icon size={13} strokeWidth={2} color="#6B6B6B" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canDelete && (
            <button
              onClick={() => bulkAction('delete')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 980, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <Trash2 size={12} /> Delete
            </button>
          )}

          <button onClick={() => setSelected(new Set())} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {bulkError && (
        <div style={{ padding: '8px 14px', background: '#F0F0F0', borderRadius: 8, fontSize: 13, color: '#3A3A3A' }}>
          {bulkError}
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        view === 'table' ? (
          <div className="panel" style={{ padding: '0 16px' }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="panel" style={{ height: 130, background: 'var(--fill)', animation: 'shimmer 1.5s infinite' }} />
            ))}
          </div>
        )
      ) : isError ? (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Failed to load posts.</p>
          <button onClick={() => window.location.reload()} className="secondary-button" style={{ marginTop: 10, fontSize: 13 }}>Retry</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
          <FileText size={28} style={{ color: 'var(--muted-2)', marginBottom: 12 }} />
          <p style={{ fontWeight: 600, color: 'var(--text)', margin: '0 0 5px' }}>No posts found</p>
          <p style={{ color: 'var(--muted)', margin: '0 0 16px', fontSize: 13 }}>
            {activeFilterCount > 0 ? 'Try adjusting your search or filters.' : 'Create the first post to get started.'}
          </p>
          {activeFilterCount > 0 ? (
            <button onClick={clearAll} className="secondary-button" style={{ fontSize: 13 }}>Clear filters</button>
          ) : !isClient && (
            <button onClick={() => navigate('/posts/new')} className="primary-button" style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Plus size={13} /> New Post
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        /* ── Grid view ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {posts.map((post) => <PostCard key={post.id} post={post} />)}
        </div>
      ) : (
        /* ── Table view ── */
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '32px minmax(200px, 1fr) 130px 110px 100px 130px 110px 110px',
            gap: '16px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--panel-border)',
            background: 'var(--fill)',
          }}>
            <input
              type="checkbox"
              checked={posts.length > 0 && selected.size === posts.length}
              onChange={toggleAll}
              style={{ cursor: 'pointer', accentColor: '#111111' }}
            />
            {[
              { label: 'Post' },
              { label: 'Client' },
              { label: 'Platforms', align: 'center' },
              { label: 'Type', align: 'center' },
              { label: 'Status', align: 'center' },
              { label: 'Scheduled', align: 'center' },
              { label: 'Assignee', align: 'center' }
            ].map(({ label, align }) => (
              <span key={label} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: align || 'left', justifySelf: align || 'start' }}>{label}</span>
            ))}
          </div>

          {/* Rows */}
          {posts.map((post, i) => (
            <div
              key={post.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px minmax(200px, 1fr) 130px 110px 100px 130px 110px 110px',
                gap: '16px',
                padding: '16px 16px',
                borderBottom: i < posts.length - 1 ? '1px solid var(--panel-border)' : 'none',
                background: selected.has(post.id) ? 'var(--fill)' : 'transparent',
                alignItems: 'center',
                transition: 'background 0.1s',
                cursor: 'pointer',
              }}
              onMouseOver={(e) => { if (!selected.has(post.id)) e.currentTarget.style.background = 'var(--fill)'; }}
              onMouseOut={(e) => { if (!selected.has(post.id)) e.currentTarget.style.background = 'transparent'; }}
              onClick={(e) => { if (e.target.type === 'checkbox') return; navigate(`/posts/${post.id}`); }}
            >
              <input
                type="checkbox"
                checked={selected.has(post.id)}
                onChange={() => toggleSelect(post.id)}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: 'pointer', accentColor: '#111111', alignSelf: 'flex-start', marginTop: 3 }}
              />
              {/* Title + caption */}
              <div style={{ minWidth: 0, paddingRight: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.title}
                </p>
                {post.caption && (
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.caption}
                  </p>
                )}
              </div>
              {/* Client */}
              <span style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {post.client?.name ?? '—'}
              </span>
              {/* Platforms */}
              <div style={{ display: 'flex', gap: 3, flexWrap: 'nowrap', overflow: 'hidden', justifySelf: 'center' }}>
                {(post.platforms ?? []).slice(0, 2).map((p) => <PlatformBadge key={p} platform={p} />)}
                {(post.platforms ?? []).length > 2 && (
                  <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>+{post.platforms.length - 2}</span>
                )}
              </div>
              {/* Content type */}
              <span style={{ fontSize: 11, color: 'var(--muted-2)', fontWeight: 500, justifySelf: 'center' }}>
                {post.contentType ? CONTENT_TYPE_LABELS[post.contentType] : <span style={{ color: 'var(--muted-2)', opacity: 0.4 }}>—</span>}
              </span>
              {/* Status */}
              <StatusBadge status={post.status} />
              {/* Scheduled */}
              <span style={{ fontSize: 12, color: 'var(--muted)', justifySelf: 'center' }}>
                {post.scheduledAt
                  ? new Date(post.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : <span style={{ color: 'var(--muted-2)', opacity: 0.4 }}>—</span>}
              </span>
              {/* Assignee */}
              <span style={{ fontSize: 12, color: post.assignedTo ? 'var(--text)' : 'var(--muted-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: post.assignedTo ? 1 : 0.5, justifySelf: 'center' }}>
                {post.assignedTo?.name ?? 'Unassigned'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!isLoading && posts.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            Showing {Math.min(page * LIMIT, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {page > 1 && (
              <button onClick={() => setPage((p) => p - 1)} className="secondary-button" style={{ fontSize: 12 }}>← Previous</button>
            )}
            {hasMore && (
              <button onClick={() => setPage((p) => p + 1)} className="primary-button" style={{ fontSize: 12 }}>
                Load more →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ── */}
      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setImportOpen(false); }}>
          <div className="panel" style={{ width: '100%', maxWidth: 620, maxHeight: '80vh', overflowY: 'auto', padding: 28, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', letterSpacing: '-0.3px' }}>Import Posts from CSV</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Upload a spreadsheet to bulk-create posts. Download the template to get started.</p>
              </div>
              <button onClick={() => setImportOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Template download */}
            <div className="panel" style={{ padding: '12px 16px', marginBottom: 16, background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600 }}>CSV Template</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                  Columns: title, caption, client_name, platforms, content_type, scheduled_date, status
                </p>
              </div>
              <button onClick={downloadCsvTemplate} className="secondary-button" style={{ fontSize: 12, gap: 5, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <Download size={13} /> Download template
              </button>
            </div>

            {/* File upload */}
            {!importRows.length && importStatus === null && (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '32px 24px', border: '2px dashed rgba(0,0,0,0.15)', borderRadius: 12, cursor: 'pointer', background: '#FAFAFA' }}>
                <Upload size={24} style={{ color: 'var(--muted-2)' }} />
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>Choose your CSV file</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Supports .csv files exported from Excel, Google Sheets, or any spreadsheet tool</p>
                </div>
                <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} style={{ display: 'none' }} />
              </label>
            )}

            {importError && (
              <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--danger)', padding: '10px 14px', background: '#FFF5F5', borderRadius: 8, border: '1px solid rgba(255,0,0,0.1)' }}>
                {importError}
              </p>
            )}

            {/* Preview table */}
            {importRows.length > 0 && importStatus === null && (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600 }}>{importRows.length} row{importRows.length !== 1 ? 's' : ''} ready to import</p>
                <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#F5F5F5', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                        {['Title', 'Client', 'Platforms', 'Status', 'Sched. Date'].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 8).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          <td style={{ padding: '8px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title || '—'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{row.client_name || '—'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{row.platforms || 'INSTAGRAM'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{row.status || 'DRAFT'}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{row.scheduled_date || '—'}</td>
                        </tr>
                      ))}
                      {importRows.length > 8 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '8px 12px', color: 'var(--muted-2)', fontStyle: 'italic', fontSize: 11 }}>
                            +{importRows.length - 8} more rows…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => { setImportRows([]); setImportError(''); }} className="secondary-button" style={{ fontSize: 13 }}>Cancel</button>
                  <button onClick={runImport} className="primary-button" style={{ fontSize: 13, gap: 5, display: 'flex', alignItems: 'center' }}>
                    <Upload size={13} /> Import {importRows.length} post{importRows.length !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            )}

            {/* Running */}
            {importStatus === 'running' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>Importing posts…</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Please wait.</p>
              </div>
            )}

            {/* Done */}
            {importStatus && importStatus !== 'running' && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>
                  {importStatus.done} post{importStatus.done !== 1 ? 's' : ''} imported
                  {importStatus.failed > 0 ? `, ${importStatus.failed} failed` : ''}
                </p>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>
                  {importStatus.failed > 0 ? 'Failed rows may have missing required fields or duplicate data.' : 'All posts have been added to your content library.'}
                </p>
                <button onClick={() => setImportOpen(false)} className="primary-button" style={{ fontSize: 13 }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
