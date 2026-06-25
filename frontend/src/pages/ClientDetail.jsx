import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Plus, Mail, Phone, Building2, Edit2, Trash2, Hash, ChevronLeft, Sparkles, ArrowUpDown, Link2, ExternalLink, X, Globe, Target, BarChart2, BookOpen, Layers, Zap, FileText, Users, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { useAuthStore } from '@/stores/authStore';
import { usePosts } from '@/hooks/usePosts';
import { useHashtags, useCreateHashtagSet, useDeleteHashtagSet } from '@/hooks/useHashtags';
import PostCard from '@/components/PostCard';
import ClientAvatar from '@/components/ClientAvatar';
import PlatformBadge from '@/components/PlatformBadge';
import { SkeletonCard } from '@/components/Skeleton';
import api from '@/lib/api';

const ALL_STATUSES = ['IDEA', 'DRAFT', 'REVIEW', 'APPROVED', 'CLIENT_APPROVED', 'SCHEDULED', 'PAUSED', 'PUBLISHED', 'REJECTED'];

const STATUS_LABELS = {
  IDEA: 'Idea', DRAFT: 'Draft', REVIEW: 'In Review',
  APPROVED: 'Approved', CLIENT_APPROVED: 'Client Approved',
  SCHEDULED: 'Scheduled', PAUSED: 'Paused', PUBLISHED: 'Published', REJECTED: 'Changes Requested',
};

const PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER', 'YOUTUBE', 'TIKTOK', 'THREADS', 'BLUESKY'];
const INDUSTRIES = [
  'Healthcare', 'Real Estate', 'IT / SaaS', 'Automotive',
  'Manufacturing / B2B', 'F&B / Hospitality', 'Retail / eCommerce',
  'Education', 'Sports / Fitness', 'Other',
];

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest first' },
  { value: 'oldest',    label: 'Oldest first' },
  { value: 'scheduled', label: 'By schedule date' },
];

function autoSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function generateInitialsLogo(name, color) {
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="42" font-family="-apple-system,sans-serif" font-size="26" font-weight="700" fill="white" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

const inputStyle = {
  borderRadius: 10, fontSize: 14, letterSpacing: '-0.12px',
  background: 'var(--panel)', border: '1px solid var(--panel-border)',
  color: 'var(--text)', width: '100%', padding: '8px 12px',
};
const labelStyle = { fontSize: 13, color: 'var(--text)', letterSpacing: '-0.12px' };

/* ─── Edit Client Modal ─── */
function EditClientModal({ client, open, onClose }) {
  const updateClient = useUpdateClient();
  const [form, setForm] = useState({
    name: client.name, color: client.color || '#0071E3',
    logoUrl: client.logoUrl || '', industry: client.industry || '',
    notes: client.notes || '', contactName: client.contactName || '',
    contactEmail: client.contactEmail || '', contactPhone: client.contactPhone || '',
    platforms: client.platforms ?? [],
  });

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }
  function togglePlatform(p) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    await updateClient.mutateAsync({ id: client.id, ...form, slug: autoSlug(form.name) });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ maxWidth: 540, maxHeight: '85vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle style={{ fontSize: 18, letterSpacing: '-0.374px' }}>Edit Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label style={labelStyle}>Client Name *</Label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} required style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label style={labelStyle}>Industry</Label>
            <select value={form.industry} onChange={(e) => set('industry', e.target.value)} style={{ ...inputStyle, height: 38 }}>
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label style={labelStyle}>Brand Color</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
                style={{ width: 38, height: 38, border: '1px solid var(--panel-border)', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
              <span style={{
                flex: 1, height: 38, borderRadius: 10,
                background: `${form.color}18`, border: `1px solid ${form.color}44`,
                display: 'flex', alignItems: 'center', paddingLeft: 12,
                fontSize: 12, fontFamily: 'monospace', color: form.color, fontWeight: 600,
              }}>{form.color}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label style={labelStyle}>Platforms</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLATFORMS.map((p) => {
                const selected = form.platforms.includes(p);
                return (
                  <button key={p} type="button" onClick={() => togglePlatform(p)} style={{
                    padding: '5px 13px', borderRadius: 980,
                    border: `1px solid ${selected ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
                    background: selected ? '#111111' : 'transparent',
                    color: selected ? '#FFFFFF' : 'var(--muted)',
                    cursor: 'pointer', fontSize: 12, fontWeight: selected ? 600 : 400, transition: 'all 0.1s',
                  }}>{p}</button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label style={labelStyle}>Internal Notes</Label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="Retainer details, brand voice, special instructions…"
              rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5', paddingTop: 8, paddingBottom: 8, minHeight: 80 }} />
          </div>

          <div style={{ height: 1, background: 'var(--separator)' }} />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Contact</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label style={labelStyle}>Contact Name</Label>
            <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Dr. Kavya Somesh" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Label style={labelStyle}>Email</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="kavya@righthospitals.in" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Label style={labelStyle}>Phone</Label>
              <Input type="tel" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="+91 98765 43210" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label style={labelStyle}>Logo URL</Label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input type="url" value={form.logoUrl.startsWith('data:') ? '' : form.logoUrl}
                onChange={(e) => set('logoUrl', e.target.value)}
                placeholder="https://client.com/logo.png" style={{ ...inputStyle, fontSize: 12 }} />
              <button type="button" className="secondary-button" style={{ fontSize: 12, whiteSpace: 'nowrap', gap: 5, display: 'flex', alignItems: 'center' }}
                onClick={() => set('logoUrl', generateInitialsLogo(form.name, form.color))} disabled={!form.name}>
                <Sparkles size={12} /> Auto
              </button>
            </div>
            {form.logoUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <img src={form.logoUrl} alt="Logo preview"
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                    {form.logoUrl.startsWith('data:') ? 'Auto-generated from initials' : 'Custom logo URL'}
                  </p>
                  <button type="button" onClick={() => set('logoUrl', '')} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline' }}>
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" className="secondary-button" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
            <button type="submit" className="primary-button" disabled={updateClient.isPending} style={{ flex: 2, justifyContent: 'center' }}>
              {updateClient.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Hashtag Sets Section ─── */
function HashtagSection({ clientId }) {
  const { data: sets = [] } = useHashtags(clientId);
  const createSet  = useCreateHashtagSet();
  const deleteSet  = useDeleteHashtagSet();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName]     = useState('');
  const [newTags, setNewTags]     = useState('');
  const [newPlatform, setNewPlatform] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    const tags = newTags.split(/[,\s]+/).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);
    if (!newName || !tags.length) return;
    await createSet.mutateAsync({ name: newName, tags, clientId, platform: newPlatform || null });
    setNewName(''); setNewTags(''); setNewPlatform(''); setAdding(false);
  }

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: sets.length > 0 || adding ? 16 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Hash size={15} strokeWidth={1.8} style={{ color: 'var(--muted)' }} />
          <h3 style={{ margin: 0 }}>Hashtag sets</h3>
          {sets.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {sets.length}</span>}
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="secondary-button" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={13} /> New set
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: sets.length > 0 ? 16 : 0, padding: 14, background: 'var(--bg)', borderRadius: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Label style={labelStyle}>Set name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Healthcare general" style={{ ...inputStyle, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Label style={labelStyle}>Platform</Label>
              <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} style={{ ...inputStyle, height: 38, fontSize: 13 }}>
                <option value="">All platforms</option>
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label style={labelStyle}>Tags * <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(comma or space separated)</span></Label>
            <textarea value={newTags} onChange={(e) => setNewTags(e.target.value)}
              placeholder="#health #wellness #hospital care"
              rows={2} style={{ ...inputStyle, resize: 'none', lineHeight: '1.5', paddingTop: 8, paddingBottom: 8 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="secondary-button" style={{ fontSize: 12 }} onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className="primary-button" style={{ fontSize: 12 }} disabled={createSet.isPending}>
              {createSet.isPending ? 'Saving…' : 'Save set'}
            </button>
          </div>
        </form>
      )}

      {sets.length === 0 && !adding && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No hashtag sets yet. Create one to reuse across posts.</p>
      )}

      {sets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sets.map((s) => (
            <div key={s.id} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</p>
                  {s.platform && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 980, background: '#F0F0F0', color: '#6B6B6B', border: '1px solid rgba(0,0,0,0.08)', fontWeight: 500 }}>{s.platform}</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {s.tags.map((t) => (
                    <span key={t} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 980, background: '#E8E8E8', color: '#3A3A3A' }}>#{t}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => deleteSet.mutate(s.id)}
                style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'color 0.12s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-2)'; }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ─── */
export default function ClientDetail() {
  const { id } = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [sort, setSort]     = useState('newest');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: clientData, isLoading: clientLoading } = useClient(id);
  const { data: postsData, isLoading: postsLoading }   = usePosts({
    clientId: id,
    status:   statusFilter   || undefined,
    platform: platformFilter || undefined,
    sort,
    limit: 100,
  });

  const deleteClient = useDeleteClient();

  const client       = clientData?.client;
  const posts        = postsData?.posts ?? [];
  const statusCounts = clientData?.statusCounts ?? {};

  // Always-accurate stats from the unfiltered statusCounts returned by the API
  const totalPosts    = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const activePosts   = (statusCounts.DRAFT ?? 0) + (statusCounts.REVIEW ?? 0) + (statusCounts.APPROVED ?? 0) + (statusCounts.SCHEDULED ?? 0);
  const pendingReview = (statusCounts.REVIEW ?? 0) + (statusCounts.CLIENT_APPROVED ?? 0);
  const published     = statusCounts.PUBLISHED ?? 0;

  // Platform breakdown from current filtered posts
  const platformCounts = (client?.platforms ?? []).reduce((acc, p) => {
    acc[p] = posts.filter((post) => (post.platforms ?? []).includes(p)).length;
    return acc;
  }, {});
  const platformTotal = Math.max(...Object.values(platformCounts), 1);

  if (clientLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SkeletonCard rows={2} />
      <SkeletonCard rows={3} />
    </div>
  );
  if (!client) return <p style={{ color: 'var(--muted)' }}>Client not found.</p>;

  async function handleDelete() {
    await deleteClient.mutateAsync(id);
    navigate('/clients');
  }

  const accentColor = client.color || '#111111';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Back */}
      <button
        onClick={() => navigate('/clients')}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '4px 0', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6, transition: 'color 0.12s' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
      >
        <ChevronLeft size={15} /> All Clients
      </button>

      {/* Client header */}
      <div className="panel" style={{ padding: 24, borderTop: `4px solid ${accentColor}`, borderRadius: '0 0 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <ClientAvatar client={client} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{client.name}</h2>
              {client.industry && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 980, background: '#F0F0F0', color: '#6B6B6B', border: '1px solid rgba(0,0,0,0.08)', fontWeight: 500 }}>
                  {client.industry}
                </span>
              )}
              {client.portalEnabled && (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 980, background: '#111', color: '#fff', fontWeight: 600 }}>
                  Portal active
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: client.notes ? 10 : 0 }}>
              {(client.platforms ?? []).map((p) => <PlatformBadge key={p} platform={p} />)}
            </div>
            {client.notes && (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>{client.notes}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <button onClick={() => navigate(`/calendar?clientId=${client.id}`)} className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
              <Calendar size={14} /> Calendar
            </button>
            <button onClick={() => setEditOpen(true)} className="secondary-button" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
              <Edit2 size={14} /> Edit
            </button>
            <button onClick={() => navigate(`/posts/new?clientId=${client.id}`)} className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Plus size={15} /> New Post
            </button>
          </div>
        </div>

        {/* Contact */}
        {(client.contactName || client.contactEmail || client.contactPhone) && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {client.contactName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={13} color="var(--muted)" />
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{client.contactName}</span>
              </div>
            )}
            {client.contactEmail && (
              <a href={`mailto:${client.contactEmail}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', textDecoration: 'none' }}>
                <Mail size={13} color="var(--muted)" />
                <span style={{ fontSize: 13 }}>{client.contactEmail}</span>
              </a>
            )}
            {client.contactPhone && (
              <a href={`tel:${client.contactPhone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', textDecoration: 'none' }}>
                <Phone size={13} color="var(--muted)" />
                <span style={{ fontSize: 13 }}>{client.contactPhone}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Stats — always unfiltered */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Total posts', value: totalPosts,    sub: 'all time' },
          { label: 'Active',      value: activePosts,   sub: 'in pipeline' },
          { label: 'In review',   value: pendingReview, sub: 'awaiting approval', urgent: pendingReview > 0 },
          { label: 'Published',   value: published,     sub: 'live' },
        ].map(({ label, value, sub, urgent }) => (
          <div key={label} className="panel" style={{ padding: '14px 16px', borderTop: urgent ? '3px solid #111' : undefined }}>
            <p style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>{value}</p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Status filter pills */}
      {Object.values(statusCounts).some((v) => v > 0) && (
        <div className="panel" style={{ padding: 16 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Filter by status</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              onClick={() => setStatusFilter('')}
              style={{
                padding: '5px 12px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${!statusFilter ? '#111' : 'rgba(0,0,0,0.1)'}`,
                background: !statusFilter ? '#111' : '#F5F5F5',
                color: !statusFilter ? '#fff' : '#3A3A3A', fontWeight: !statusFilter ? 600 : 400,
              }}
            >
              All · {totalPosts}
            </button>
            {ALL_STATUSES.filter((s) => statusCounts[s] > 0).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                style={{
                  padding: '5px 12px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${statusFilter === s ? '#111' : 'rgba(0,0,0,0.1)'}`,
                  background: statusFilter === s ? '#111' : '#F5F5F5',
                  color: statusFilter === s ? '#fff' : '#3A3A3A',
                  fontWeight: statusFilter === s ? 600 : 400,
                }}
              >
                {STATUS_LABELS[s]} · {statusCounts[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Platform breakdown */}
      {Object.keys(platformCounts).length > 0 && (
        <div className="panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>Platform breakdown</h3>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--muted)' }}>Posts per platform (a post can appear on multiple)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([p, count]) => {
              const pct = Math.round((count / platformTotal) * 100);
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', minWidth: 100 }}>{p}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#EBEBEB', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: accentColor, borderRadius: 3, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 50, textAlign: 'right' }}>{count} post{count !== 1 ? 's' : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Post list controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Platform filter pills */}
        {(client.platforms ?? []).length > 1 && (
          <div style={{ display: 'flex', gap: 5 }}>
            <button
              onClick={() => setPlatformFilter('')}
              style={{
                padding: '5px 12px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${!platformFilter ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)'}`,
                background: !platformFilter ? '#F0F0F0' : 'transparent',
                color: 'var(--text)', fontWeight: !platformFilter ? 600 : 400,
              }}
            >
              All
            </button>
            {(client.platforms ?? []).map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(platformFilter === p ? '' : p)}
                style={{
                  padding: '5px 12px', borderRadius: 980, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${platformFilter === p ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)'}`,
                  background: platformFilter === p ? '#F0F0F0' : 'transparent',
                  color: 'var(--text)', fontWeight: platformFilter === p ? 600 : 400,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowUpDown size={13} style={{ color: 'var(--muted)' }} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            style={{
              background: 'var(--panel)', border: '1px solid rgba(0,0,0,0.12)',
              color: 'var(--text)', borderRadius: 8, padding: '6px 10px',
              fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {posts.length} post{posts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Post list */}
      {postsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', margin: 0 }}>No posts match the current filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map((p) => <PostCard key={p.id} post={p} compact />)}
        </div>
      )}

      {/* Hashtag sets */}
      <HashtagSection clientId={id} />

      {/* Content Strategy */}
      <ClientStrategyEditor client={client} />

      {/* Associated Pages — partner and influencer accounts */}
      <AssociatedPagesEditor client={client} />

      {/* Link-in-bio editor */}
      <LinkInBioEditor client={client} />

      {/* Danger zone — Super Admin only */}
      {isSuperAdmin && <div className="panel" style={{ padding: 20 }}>
        <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Danger zone</p>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)' }}>Deleting this client removes all associated posts and data permanently.</p>
        {!deleteConfirm ? (
          <button onClick={() => setDeleteConfirm(true)} style={{ background: 'none', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={13} /> Delete client
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Are you sure?</span>
            <button onClick={handleDelete} disabled={deleteClient.isPending} style={{ background: 'var(--danger)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>
              {deleteClient.isPending ? 'Deleting…' : 'Yes, delete'}
            </button>
            <button onClick={() => setDeleteConfirm(false)} className="secondary-button" style={{ fontSize: 13 }}>Cancel</button>
          </div>
        )}
      </div>}

      {/* Edit modal */}
      {editOpen && <EditClientModal client={client} open={editOpen} onClose={() => setEditOpen(false)} />}
    </div>
  );
}

/* ═══ Client Strategy Editor ════════════════════════════════════════════ */
function ClientStrategyEditor({ client }) {
  const updateClient = useUpdateClient();
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const DEFAULT_STRATEGY = {
    businessGoals:    ['', ''],
    socialGoals:      ['', '', ''],
    contentPillars:   [
      { name: '', description: '' },
      { name: '', description: '' },
      { name: '', description: '' },
      { name: '', description: '' },
    ],
    cornerstoneContent: ['', '', '', '', '', ''],
    socialFormats:      ['', '', '', '', '', ''],
    scopeOfWork:        '',
  };

  const [strategy, setStrategy] = useState(() => {
    const s = client?.strategy ?? {};
    return {
      businessGoals:      s.businessGoals      ?? DEFAULT_STRATEGY.businessGoals,
      socialGoals:        s.socialGoals        ?? DEFAULT_STRATEGY.socialGoals,
      contentPillars:     s.contentPillars     ?? DEFAULT_STRATEGY.contentPillars,
      cornerstoneContent: s.cornerstoneContent ?? DEFAULT_STRATEGY.cornerstoneContent,
      socialFormats:      s.socialFormats      ?? DEFAULT_STRATEGY.socialFormats,
      scopeOfWork:        s.scopeOfWork        ?? '',
    };
  });

  function setArr(key, i, val) {
    setStrategy((s) => { const arr = [...s[key]]; arr[i] = val; return { ...s, [key]: arr }; });
  }
  function setPillar(i, field, val) {
    setStrategy((s) => {
      const arr = [...s.contentPillars];
      arr[i] = { ...arr[i], [field]: val };
      return { ...s, contentPillars: arr };
    });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateClient.mutateAsync({ id: client.id, strategy });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Strategy save failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  const isConfigured = client?.strategy?.contentPillars?.some((p) => p.name);
  const inp = { border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', color: 'var(--text)', width: '100%' };
  const sectionHd = { margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 };

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target size={14} color="var(--muted)" />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Content Strategy</p>
        </div>
        <button onClick={() => setOpen((v) => !v)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {!open && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {isConfigured
            ? `${client.strategy.contentPillars.filter((p) => p.name).map((p) => p.name).join(' · ')}`
            : 'Not configured yet. Click Edit to set goals, pillars, and scope.'}
        </p>
      )}

      {open && (
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>

          {/* Business Goals */}
          <div>
            <p style={sectionHd}><BarChart2 size={11} /> Business Goals</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {strategy.businessGoals.map((g, i) => (
                <input key={i} value={g} onChange={(e) => setArr('businessGoals', i, e.target.value)}
                  placeholder={`Business goal ${i + 1} — e.g. Increase brand awareness by 100%`} style={inp} />
              ))}
            </div>
          </div>

          {/* Social Media Goals */}
          <div>
            <p style={sectionHd}><Zap size={11} /> Social Media Goals</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {strategy.socialGoals.map((g, i) => (
                <input key={i} value={g} onChange={(e) => setArr('socialGoals', i, e.target.value)}
                  placeholder={`Social goal ${i + 1} — e.g. Double Instagram followers`} style={inp} />
              ))}
            </div>
          </div>

          {/* Content Pillars */}
          <div>
            <p style={sectionHd}><Layers size={11} /> Content Pillars</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {strategy.contentPillars.map((pillar, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 10, background: 'var(--bg)', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Pillar {i + 1}</span>
                  <input value={pillar.name} onChange={(e) => setPillar(i, 'name', e.target.value)}
                    placeholder="e.g. Education" style={{ ...inp, fontSize: 12, fontWeight: 600 }} />
                  <input value={pillar.description} onChange={(e) => setPillar(i, 'description', e.target.value)}
                    placeholder="What this pillar covers…" style={{ ...inp, fontSize: 11 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Cornerstone Content */}
          <div>
            <p style={sectionHd}><BookOpen size={11} /> Cornerstone Content</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {strategy.cornerstoneContent.map((c, i) => (
                <input key={i} value={c} onChange={(e) => setArr('cornerstoneContent', i, e.target.value)}
                  placeholder={`e.g. Blog posts`} style={{ ...inp, fontSize: 12 }} />
              ))}
            </div>
          </div>

          {/* Social Formats */}
          <div>
            <p style={sectionHd}><Layers size={11} /> Social Media Formats / Tactics</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {strategy.socialFormats.map((f, i) => (
                <input key={i} value={f} onChange={(e) => setArr('socialFormats', i, e.target.value)}
                  placeholder={`e.g. Instagram Reels`} style={{ ...inp, fontSize: 12 }} />
              ))}
            </div>
          </div>

          {/* Scope of Work */}
          <div>
            <p style={sectionHd}><FileText size={11} /> Scope of Work</p>
            <textarea value={strategy.scopeOfWork} onChange={(e) => setStrategy((s) => ({ ...s, scopeOfWork: e.target.value }))}
              placeholder="Monthly deliverables — e.g. 30 Instagram posts (10 reels, 10 carousels, 10 static), 12 LinkedIn posts, 8 Facebook posts…"
              rows={3} style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="submit" disabled={saving} className="primary-button" style={{ fontSize: 12 }}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Strategy'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ═══ Link-in-Bio Editor ══════════════════════════════════════════════ */
function LinkInBioEditor({ client }) {
  const [title,   setTitle]   = useState(client?.bioTitle ?? '');
  const [desc,    setDesc]    = useState(client?.bioDescription ?? '');
  const [links,   setLinks]   = useState(client?.bioLinks ?? []);
  const [newLabel,setNewLabel] = useState('');
  const [newUrl,  setNewUrl]   = useState('');
  const [saving,  setSaving]   = useState(false);
  const [saved,   setSaved]    = useState(false);
  const [open,    setOpen]     = useState(false);

  const bioPageUrl = `${window.location.origin}/bio/${client?.slug}`;

  function addLink(e) {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;
    setLinks((prev) => [...prev, { label: newLabel.trim(), url: newUrl.trim() }]);
    setNewLabel(''); setNewUrl('');
  }

  function removeLink(i) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/bio/${client.slug}`, { bioTitle: title, bioDescription: desc, bioLinks: links });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Bio save failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputSt = { border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', color: 'var(--text)', width: '100%' };

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2 size={14} color="var(--muted)" />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Link-in-Bio Page</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {client?.bioTitle && (
            <a href={bioPageUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#0077B5', textDecoration: 'none', fontWeight: 500 }}
            >
              <ExternalLink size={11} /> View page
            </a>
          )}
          <button onClick={() => setOpen((v) => !v)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            {open ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>

      {!open && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {client?.bioTitle ? `"${client.bioTitle}" · ${(client?.bioLinks ?? []).length} link${(client?.bioLinks ?? []).length !== 1 ? 's' : ''}` : 'Not set up yet. Click Edit to configure.'}
        </p>
      )}

      {open && (
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
          <div>
            <Label>Page title</Label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`${client?.name}'s Links`} style={inputSt} />
          </div>
          <div>
            <Label>Description <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(optional)</span></Label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="A short tagline or brand description" style={inputSt} />
          </div>

          <div>
            <Label>Links</Label>
            {links.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6, marginBottom: 10 }}>
                {links.map((link, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--bg)', borderRadius: 7, border: '1px solid rgba(0,0,0,0.07)' }}>
                    <Globe size={12} color="var(--muted-2)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 60 }}>{link.label}</span>
                    <span style={{ flex: 1, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</span>
                    <button type="button" onClick={() => removeLink(i)} style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 2, display: 'flex' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-2)'; }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6 }}>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label" style={{ ...inputSt, fontSize: 12 }} />
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" style={{ ...inputSt, fontSize: 12 }} onKeyDown={(e) => { if (e.key === 'Enter') addLink(e); }} />
              <button type="button" onClick={addLink} disabled={!newLabel.trim() || !newUrl.trim()} style={{ background: '#111', border: 'none', color: '#fff', borderRadius: 8, padding: '0 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: (newLabel.trim() && newUrl.trim()) ? 1 : 0.4 }}>
                Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="submit" disabled={saving} className="primary-button" style={{ fontSize: 12 }}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Bio Page'}
            </button>
            {client?.bioTitle && (
              <a href={bioPageUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0077B5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={11} /> Preview live page
              </a>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

/* ═══ Associated Pages Editor ══════════════════════════════════════════ */
const PAGE_PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER', 'YOUTUBE', 'TIKTOK', 'THREADS', 'BLUESKY', 'OTHER'];
const PAGE_TYPES = ['Partner', 'Influencer', 'Brand', 'Media'];

function AssociatedPagesEditor({ client }) {
  const updateClient = useUpdateClient();
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const [pages, setPages] = useState(() => client?.associatedPages ?? []);
  const [newPage, setNewPage] = useState({ name: '', platform: 'INSTAGRAM', handle: '', type: 'Partner' });

  const inputSt = {
    borderRadius: 8, fontSize: 13, background: 'var(--bg)',
    border: '1px solid rgba(0,0,0,0.12)', color: 'var(--text)',
    padding: '6px 10px', fontFamily: 'inherit', outline: 'none', width: '100%',
  };

  function addPage() {
    if (!newPage.name.trim() || !newPage.handle.trim()) return;
    const entry = { id: `pg-${Date.now()}`, ...newPage, name: newPage.name.trim(), handle: newPage.handle.trim() };
    setPages((prev) => [...prev, entry]);
    setNewPage({ name: '', platform: 'INSTAGRAM', handle: '', type: 'Partner' });
  }

  function removePage(id) {
    setPages((prev) => prev.filter((p) => p.id !== id));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateClient.mutateAsync({ id: client.id, associatedPages: pages });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Associated pages save failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  const PLATFORM_COLOR = {
    INSTAGRAM: '#C13584', LINKEDIN: '#0077B5', FACEBOOK: '#1877F2',
    TWITTER: '#1A1A1A', YOUTUBE: '#FF0000', TIKTOK: '#000000',
    THREADS: '#1A1A1A', BLUESKY: '#0085FF', OTHER: '#6B6B6B',
  };

  const TYPE_STYLE = {
    Partner:    { bg: '#EFF6FF', color: '#2563EB' },
    Influencer: { bg: '#FDF4FF', color: '#9333EA' },
    Brand:      { bg: '#F0FDF4', color: '#16A34A' },
    Media:      { bg: '#FFF7ED', color: '#EA580C' },
  };

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} color="var(--muted)" />
          <h3 style={{ margin: 0, fontSize: 14 }}>Associated Pages</h3>
          <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 980, padding: '1px 7px', fontWeight: 500 }}>
            {pages.length} page{pages.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={() => setOpen((v) => !v)} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      {!open && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {pages.length === 0
            ? 'No pages added yet. Click Edit to add partner or influencer accounts to tag.'
            : pages.slice(0, 3).map((p) => p.name).join(', ') + (pages.length > 3 ? ` +${pages.length - 3} more` : '')}
        </p>
      )}

      {open && (
        <form onSubmit={save} style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pages.map((p) => {
                const dot = PLATFORM_COLOR[p.platform] ?? '#6B6B6B';
                const ts = TYPE_STYLE[p.type] ?? TYPE_STYLE.Partner;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: '#6B6B6B' }}>{p.handle}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 980, background: ts.bg, color: ts.color, fontWeight: 600 }}>{p.type}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{p.platform}</span>
                    <button type="button" onClick={() => removePage(p.id)} style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 2, display: 'flex', borderRadius: 4 }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-2)'; }}>
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ padding: '12px 14px', background: '#FAFAFA', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add page</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1fr auto', gap: 6, alignItems: 'end' }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--muted)' }}>Page / Account name</p>
                <input value={newPage.name} onChange={(e) => setNewPage((p) => ({ ...p, name: e.target.value }))} placeholder="Right Hospitals Official" style={inputSt} />
              </div>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--muted)' }}>Platform</p>
                <select value={newPage.platform} onChange={(e) => setNewPage((p) => ({ ...p, platform: e.target.value }))} style={inputSt}>
                  {PAGE_PLATFORMS.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                </select>
              </div>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--muted)' }}>Handle / URL</p>
                <input value={newPage.handle} onChange={(e) => setNewPage((p) => ({ ...p, handle: e.target.value }))} placeholder="@accountname" style={inputSt}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPage(); } }} />
              </div>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--muted)' }}>Type</p>
                <select value={newPage.type} onChange={(e) => setNewPage((p) => ({ ...p, type: e.target.value }))} style={inputSt}>
                  {PAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="button" onClick={addPage} disabled={!newPage.name.trim() || !newPage.handle.trim()}
                style={{ background: '#111', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: (newPage.name.trim() && newPage.handle.trim()) ? 1 : 0.4, whiteSpace: 'nowrap' }}>
                + Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="submit" disabled={saving} className="primary-button" style={{ fontSize: 12 }}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Pages'}
            </button>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
              These will appear as tag/collab options when creating posts for {client?.name}.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
