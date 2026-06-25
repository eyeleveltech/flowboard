import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Mail, Phone, Sparkles, Building2, Search, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { SkeletonCard } from '@/components/Skeleton';
import PlatformBadge from '@/components/PlatformBadge';

const PLATFORMS = ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER', 'YOUTUBE', 'TIKTOK', 'THREADS', 'BLUESKY'];

const INDUSTRIES = [
  'Healthcare', 'Real Estate', 'IT / SaaS', 'Automotive',
  'Manufacturing / B2B', 'F&B / Hospitality', 'Retail / eCommerce',
  'Education', 'Sports / Fitness', 'Other',
];

const EMPTY_FORM = {
  name: '', color: '#0071E3', logoUrl: '',
  industry: '', notes: '',
  contactName: '', contactEmail: '', contactPhone: '',
  platforms: [],
};

const ACTIVE_STATUSES = new Set(['DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED']);

function generateInitialsLogo(name, color) {
  const initials = name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="${color}"/><text x="32" y="42" font-family="-apple-system,sans-serif" font-size="26" font-weight="700" fill="white" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function autoSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const navigate = useNavigate();
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [step, setStep]       = useState(1);
  const [search, setSearch]   = useState('');
  const [step1Error, setStep1Error] = useState('');

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  function togglePlatform(p) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  }

  function handleGenerateLogo() {
    if (!form.name) return;
    set('logoUrl', generateInitialsLogo(form.name, form.color));
  }

  function goToStep2() {
    if (!form.name.trim()) { setStep1Error('Client name is required.'); return; }
    setStep1Error('');
    setStep(2);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const payload = { ...form, slug: autoSlug(form.name) };
    if (!payload.logoUrl) delete payload.logoUrl;
    await createClient.mutateAsync(payload);
    setOpen(false);
    setForm(EMPTY_FORM);
    setStep(1);
  }

  function handleOpenChange(v) {
    setOpen(v);
    if (!v) { setForm(EMPTY_FORM); setStep(1); setStep1Error(''); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.industry ?? '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 style={{ margin: 0 }}>
            Clients
            {clients.length > 0 && (
              <span style={{ fontSize: 15, fontWeight: 400, color: 'var(--muted)', marginLeft: 8 }}>· {clients.length}</span>
            )}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…"
              style={{
                paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                border: '1px solid var(--panel-border)', borderRadius: 8,
                background: 'var(--panel)', fontSize: 13, color: 'var(--text)',
                fontFamily: 'inherit', outline: 'none', width: 200,
              }}
            />
          </div>

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <button className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={15} strokeWidth={2.5} /> Add Client
              </button>
            </DialogTrigger>

            <DialogContent style={{ maxWidth: 520 }}>
              <DialogHeader>
                <DialogTitle style={{ fontSize: 18, letterSpacing: '-0.374px' }}>Add New Client</DialogTitle>
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  {['Basics & Platforms', 'Contact & Logo'].map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => i === 0 ? setStep(1) : goToStep2()}
                      style={{
                        flex: 1, padding: '6px 0', borderRadius: 980, border: 'none',
                        background: step === i + 1 ? 'var(--accent)' : 'var(--bg)',
                        color: step === i + 1 ? '#fff' : 'var(--muted)',
                        fontSize: 12, fontWeight: step === i + 1 ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {i + 1}. {label}
                    </button>
                  ))}
                </div>
              </DialogHeader>

              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>

                {step === 1 && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
                        <Label style={labelStyle}>Client Name *</Label>
                        <Input
                          value={form.name}
                          onChange={(e) => { set('name', e.target.value); setStep1Error(''); }}
                          placeholder="Right Hospitals"
                          style={inputStyle}
                        />
                        {step1Error && <p style={{ margin: 0, fontSize: 12, color: 'var(--danger)' }}>{step1Error}</p>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
                        <Label style={labelStyle}>Industry</Label>
                        <select value={form.industry} onChange={(e) => set('industry', e.target.value)} style={{ ...inputStyle, height: 38 }}>
                          <option value="">Select industry</option>
                          {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <Label style={labelStyle}>Brand Color</Label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="color"
                          value={form.color}
                          onChange={(e) => set('color', e.target.value)}
                          style={{ width: 38, height: 38, border: '1px solid var(--panel-border)', borderRadius: 8, cursor: 'pointer', padding: 2 }}
                        />
                        <span style={{
                          flex: 1, height: 38, borderRadius: 10,
                          background: `${form.color}18`, border: `1px solid ${form.color}44`,
                          display: 'flex', alignItems: 'center', paddingLeft: 12,
                          fontSize: 12, fontFamily: 'monospace', color: form.color, fontWeight: 600,
                        }}>
                          {form.color}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Label style={labelStyle}>Platforms</Label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {PLATFORMS.map((p) => {
                          const selected = form.platforms.includes(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => togglePlatform(p)}
                              style={{
                                padding: '5px 13px', borderRadius: 980,
                                border: `1px solid ${selected ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
                                background: selected ? '#111111' : 'transparent',
                                color: selected ? '#FFFFFF' : 'var(--muted)',
                                cursor: 'pointer', fontSize: 12, fontWeight: selected ? 600 : 400, transition: 'all 0.1s',
                              }}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <Label style={labelStyle}>Internal Notes</Label>
                      <textarea
                        value={form.notes}
                        onChange={(e) => set('notes', e.target.value)}
                        placeholder="Retainer details, brand voice guidelines, special instructions..."
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5', paddingTop: 8, paddingBottom: 8, minHeight: 80 }}
                      />
                    </div>

                    <button type="button" className="primary-button" onClick={goToStep2} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                      Next: Contact &amp; Logo →
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                        Who's the primary contact at this client?
                      </p>

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

                      {/* Logo */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <Label style={labelStyle}>Logo</Label>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{
                            width: 52, height: 52, borderRadius: 12,
                            background: form.logoUrl ? 'transparent' : `${form.color}18`,
                            border: `1.5px solid ${form.color}44`,
                            overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {form.logoUrl
                              ? <img src={form.logoUrl} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span style={{ fontSize: 18, fontWeight: 700, color: form.color }}>{form.name ? form.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?'}</span>
                            }
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button type="button" onClick={handleGenerateLogo} disabled={!form.name} className="secondary-button" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                              <Sparkles size={13} /> Generate from initials
                            </button>
                            {form.logoUrl && (
                              <button type="button" onClick={() => set('logoUrl', '')} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                                Remove logo
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <Label style={{ ...labelStyle, color: 'var(--muted)' }}>Or paste a logo URL</Label>
                          <Input
                            type="url"
                            value={form.logoUrl.startsWith('data:') ? '' : form.logoUrl}
                            onChange={(e) => set('logoUrl', e.target.value)}
                            placeholder="https://client.com/logo.png"
                            style={{ ...inputStyle, fontSize: 12 }}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button type="button" className="secondary-button" onClick={() => setStep(1)} style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
                      <button type="submit" className="primary-button" disabled={createClient.isPending} style={{ flex: 2, justifyContent: 'center' }}>
                        {createClient.isPending ? 'Creating…' : 'Create Client'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Client grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} rows={2} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel" style={{ padding: '56px 40px', textAlign: 'center' }}>
          <Building2 size={32} strokeWidth={1.2} style={{ color: 'var(--muted-2)', marginBottom: 12 }} />
          <p style={{ color: 'var(--text)', fontWeight: 600, margin: '0 0 6px', fontSize: 16 }}>
            {search ? 'No clients match your search' : 'No clients yet'}
          </p>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>
            {search ? 'Try a different name or industry.' : 'Add your first client to start managing their content.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} onClick={() => navigate(`/clients/${client.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle = { fontSize: 13, color: 'var(--text)', letterSpacing: '-0.12px' };
const inputStyle = {
  borderRadius: 10, fontSize: 14, letterSpacing: '-0.12px',
  background: 'var(--panel)', border: '1px solid var(--panel-border)',
  color: 'var(--text)', width: '100%', padding: '8px 12px',
};

function ClientCard({ client, onClick }) {
  const sc            = client.statusCounts ?? {};
  const active        = (sc.DRAFT ?? 0) + (sc.REVIEW ?? 0) + (sc.APPROVED ?? 0) + (sc.SCHEDULED ?? 0);
  const inReview      = sc.REVIEW ?? 0;
  const published     = sc.PUBLISHED ?? 0;
  const initials      = client.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const accentColor   = client.color || '#111111';

  return (
    <article
      onClick={onClick}
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--panel-border)',
        borderRadius: 18,
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'var(--panel-border)'; }}
    >
      {/* Brand color accent */}
      <div style={{ height: 4, background: accentColor, flexShrink: 0 }} />

      <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Logo + name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: `${accentColor}18`, border: `1.5px solid ${accentColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {client.logoUrl
              ? <img src={client.logoUrl} alt={client.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 16, fontWeight: 700, color: accentColor, letterSpacing: '-0.5px' }}>{initials}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {client.name}
              </p>
              {client.portalEnabled && (
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 980, background: '#111', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  Portal
                </span>
              )}
            </div>
            {client.industry && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{client.industry}</p>
            )}
          </div>
          <ChevronRight size={15} style={{ color: 'var(--muted-2)', flexShrink: 0 }} />
        </div>

        {/* Contact */}
        {(client.contactName || client.contactEmail || client.contactPhone) && (
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {client.contactName && (
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{client.contactName}</p>
            )}
            {client.contactEmail && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <a href={`mailto:${client.contactEmail}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: 'var(--text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {client.contactEmail}
                </a>
              </div>
            )}
            {client.contactPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <a href={`tel:${client.contactPhone}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: 'var(--text)', textDecoration: 'none' }}>
                  {client.contactPhone}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Platform pills */}
        {client.platforms?.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {client.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
          </div>
        )}

        {/* Pipeline summary */}
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 0, background: 'var(--bg)', borderRadius: 10, overflow: 'hidden' }}>
          {[
            { label: 'Active', value: active },
            { label: 'In review', value: inReview, urgent: inReview > 0 },
            { label: 'Published', value: published },
          ].map(({ label, value, urgent }, i, arr) => (
            <div key={label} style={{ flex: 1, padding: '10px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid var(--panel-border)' : 'none' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: urgent ? '#111' : 'var(--text)', letterSpacing: '-0.374px' }}>{value}</p>
              <p style={{ margin: 0, fontSize: 10, color: urgent ? '#111' : 'var(--muted)', fontWeight: urgent ? 600 : 400 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
