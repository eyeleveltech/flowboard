import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreatePost } from '@/hooks/usePosts';
import { useClients } from '@/hooks/useClients';
import { useUsers } from '@/hooks/useUsers';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Sparkles, Hash, Lightbulb, Eye, EyeOff, GripVertical, X, Plus, Image, Loader2,
} from 'lucide-react';
import api from '@/lib/api';

/* ─── Platform config ───────────────────────────────────────────────── */
const ALL_PLATFORMS = [
  { key: 'INSTAGRAM', label: 'Instagram'  },
  { key: 'LINKEDIN',  label: 'LinkedIn'   },
  { key: 'FACEBOOK',  label: 'Facebook'   },
  { key: 'TWITTER',   label: 'X / Twitter'},
  { key: 'YOUTUBE',   label: 'YouTube'    },
  { key: 'TIKTOK',    label: 'TikTok'     },
  { key: 'THREADS',   label: 'Threads'    },
  { key: 'BLUESKY',   label: 'Bluesky'    },
];

const PLATFORM_LIMITS = {
  INSTAGRAM: 2200,
  LINKEDIN:  3000,
  FACEBOOK:  63206,
  TWITTER:   280,
  YOUTUBE:   5000,
  TIKTOK:    2200,
  THREADS:   500,
  BLUESKY:   300,
};

const PLATFORM_FORMATS = {
  INSTAGRAM: ['Feed Post', 'Reel', 'Story', 'Carousel'],
  TIKTOK:    ['Video', 'Duet', 'Stitch'],
};

const PLATFORM_COLORS = {
  INSTAGRAM: '#C13584',
  LINKEDIN:  '#0077B5',
  FACEBOOK:  '#1877F2',
  TWITTER:   '#1A1A1A',
  YOUTUBE:   '#FF0000',
  TIKTOK:    '#000000',
  THREADS:   '#1A1A1A',
  BLUESKY:   '#0085FF',
};

const CONTENT_TYPES = ['CAROUSEL', 'REEL', 'STATIC_IMAGE', 'VIDEO', 'STORY', 'THREAD', 'LONG_FORM'];
const CATEGORIES    = ['Educational', 'Promotional', 'Community', 'Behind-the-Scenes', 'Announcement', 'Seasonal', 'User Generated'];

const inputStyle = {
  background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.12)',
  color: 'var(--text)', borderRadius: 8, padding: '9px 12px',
  fontSize: 14, width: '100%', fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.1s',
};
const selectStyle = { ...inputStyle };

function FieldError({ msg }) {
  if (!msg) return null;
  return <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{msg}</p>;
}

/* ─── Platform Preview Card ─────────────────────────────────────────── */
function PlatformPreviewCard({ platform, caption, hashtags, mediaUrl, clientName }) {
  const color       = PLATFORM_COLORS[platform] ?? '#3A3A3A';
  const limit       = PLATFORM_LIMITS[platform] ?? 9999;
  const full        = `${caption || ''}${hashtags ? '\n\n' + hashtags : ''}`;
  const over        = full.length > limit;
  const previewText = full.length > 300 ? full.slice(0, 300) + '…' : full;

  return (
    <div style={{
      border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden',
      background: '#fff', minWidth: 200, flex: '1 1 200px', maxWidth: 280,
    }}>
      <div style={{ background: color, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
          {ALL_PLATFORMS.find((p) => p.key === platform)?.label ?? platform}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 'auto' }}>
          {full.length} / {limit}
          {over && <span style={{ color: '#FFD700', fontWeight: 700, marginLeft: 4 }}>OVER</span>}
        </span>
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
            {(clientName || 'B').charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#1A1A1A' }}>{clientName || 'Brand'}</p>
            <p style={{ margin: 0, fontSize: 9, color: '#6B6B6B' }}>Just now</p>
          </div>
        </div>
        {mediaUrl ? (
          <img src={mediaUrl} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: 80, background: '#F5F5F5', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image size={20} color="#C0C0C0" />
          </div>
        )}
        {previewText ? (
          <p style={{ margin: 0, fontSize: 11, color: '#1A1A1A', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {previewText}
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 11, color: '#ADADAD', fontStyle: 'italic' }}>Caption will appear here…</p>
        )}
        {over && (
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#dc2626', fontWeight: 600 }}>
            {full.length - limit} characters over the {ALL_PLATFORMS.find((p) => p.key === platform)?.label} limit
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Main Form ─────────────────────────────────────────────────────── */
export default function PostForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClient = searchParams.get('clientId') ?? '';

  const [form, setForm] = useState({
    title: '',
    caption: '',
    hashtags: '',
    selectedPlatforms: [],
    platformFormats: {},
    contentType: '',
    category: '',
    contentPillar: '',
    assetLink: '',
    clientId: preselectedClient,
    assignedToId: '',
    scheduledAt: '',
  });
  const [taggedPageIds, setTaggedPageIds] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);
  const [newImageUrl,    setNewImageUrl]    = useState('');
  const [showPreview,    setShowPreview]    = useState(false);
  const [errors,         setErrors]         = useState({});
  const [submitError,    setSubmitError]    = useState('');

  const [aiHashtags, setAiHashtags] = useState({ loading: false, error: '' });
  const [aiIdeas,    setAiIdeas]    = useState({ loading: false, error: '', open: false, list: [] });
  const [aiImage,    setAiImage]    = useState({ loading: false, error: '', prompt: '', open: false });

  const { data: clients = [] } = useClients();
  const { data: users   = [] } = useUsers();
  const createPost = useCreatePost();

  useEffect(() => {
    if (preselectedClient) setForm((f) => ({ ...f, clientId: preselectedClient }));
  }, [preselectedClient]);

  const selectedClient     = clients.find((c) => c.id === form.clientId);
  const availablePlatforms = selectedClient?.platforms?.length
    ? ALL_PLATFORMS.filter((p) => selectedClient.platforms.includes(p.key))
    : ALL_PLATFORMS;

  useEffect(() => {
    if (!form.clientId) return;
    const allowed  = new Set(availablePlatforms.map((p) => p.key));
    const filtered = form.selectedPlatforms.filter((p) => allowed.has(p));
    if (filtered.length !== form.selectedPlatforms.length) {
      setForm((f) => ({ ...f, selectedPlatforms: filtered }));
    }
  }, [form.clientId]);

  function togglePlatform(key) {
    setForm((f) => {
      const has = f.selectedPlatforms.includes(key);
      return { ...f, selectedPlatforms: has ? f.selectedPlatforms.filter((p) => p !== key) : [...f.selectedPlatforms, key] };
    });
    setErrors((e) => ({ ...e, platforms: undefined }));
  }

  const captionPlusHashtags = `${form.caption}${form.hashtags ? '\n\n' + form.hashtags : ''}`;
  const effectivePlatforms  = form.selectedPlatforms.length ? form.selectedPlatforms : Object.keys(PLATFORM_LIMITS);
  const minLimit            = Math.min(...effectivePlatforms.map((p) => PLATFORM_LIMITS[p] ?? 9999));
  const constraintPlatform  = ALL_PLATFORMS.find((p) => PLATFORM_LIMITS[p.key] === minLimit);
  const captionLen          = captionPlusHashtags.length;
  const overLimit           = captionLen > minLimit;

  const perPlatformStatus = form.selectedPlatforms.map((p) => ({
    key: p,
    label: ALL_PLATFORMS.find((pl) => pl.key === p)?.label ?? p,
    limit: PLATFORM_LIMITS[p] ?? 9999,
    over: captionPlusHashtags.length > (PLATFORM_LIMITS[p] ?? 9999),
  }));

  function addCarouselImage(e) {
    e.preventDefault();
    const url = newImageUrl.trim();
    if (!url || carouselImages.length >= 20) return;
    setCarouselImages((prev) => [...prev, { id: `img-${Date.now()}-${prev.length}`, url }]);
    setNewImageUrl('');
  }

  function removeCarouselImage(id) {
    setCarouselImages((prev) => prev.filter((img) => img.id !== id));
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const items = Array.from(carouselImages);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setCarouselImages(items);
  }

  async function suggestHashtags() {
    if (!form.caption && !form.title) return;
    setAiHashtags({ loading: true, error: '' });
    try {
      const { data } = await api.post('/ai/hashtags', {
        caption: form.caption, title: form.title,
        platforms: form.selectedPlatforms,
        clientName: selectedClient?.name,
        industry: selectedClient?.industry,
      });
      const hashStr = data.hashtags.join(' ');
      setForm((f) => ({ ...f, hashtags: f.hashtags ? f.hashtags + ' ' + hashStr : hashStr }));
      setAiHashtags({ loading: false, error: '' });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Hashtag suggestion failed.';
      setAiHashtags({ loading: false, error: msg });
      setTimeout(() => setAiHashtags((s) => ({ ...s, error: '' })), 4000);
    }
  }

  async function fetchIdeas() {
    setAiIdeas((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await api.post('/ai/ideas', {
        clientName: selectedClient?.name,
        industry: selectedClient?.industry,
        platforms: form.selectedPlatforms,
      });
      setAiIdeas({ loading: false, error: '', open: true, list: data.ideas });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Ideas generation failed.';
      setAiIdeas((s) => ({ ...s, loading: false, error: msg }));
      setTimeout(() => setAiIdeas((s) => ({ ...s, error: '' })), 4000);
    }
  }

  async function generateImage() {
    if (!aiImage.prompt.trim()) return;
    setAiImage((s) => ({ ...s, loading: true, error: '' }));
    try {
      const { data } = await api.post('/ai/image', { prompt: aiImage.prompt });
      setCarouselImages((prev) => [...prev, { id: `img-ai-${Date.now()}`, url: data.url }]);
      setAiImage((s) => ({ ...s, loading: false, open: false, prompt: '' }));
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Image generation failed.';
      setAiImage((s) => ({ ...s, loading: false, error: msg }));
      setTimeout(() => setAiImage((s) => ({ ...s, error: '' })), 5000);
    }
  }

  function validate() {
    const e = {};
    if (!form.title.trim())             e.title     = 'Post title is required.';
    if (!form.clientId)                 e.clientId  = 'Select a client.';
    if (!form.selectedPlatforms.length) e.platforms = 'Select at least one platform.';
    if (overLimit) e.caption = `Over the ${constraintPlatform?.label} limit by ${captionLen - minLimit} characters.`;
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitError('');
    try {
      const payload = {
        title:       form.title.trim(),
        caption:     form.caption || undefined,
        hashtags:    form.hashtags ? form.hashtags.split(/\s+/).map((t) => t.trim()).filter(Boolean) : [],
        platforms:   form.selectedPlatforms,
        contentType: form.contentType || undefined,
        category:    form.category || undefined,
        clientId:    form.clientId,
        assignedToId:form.assignedToId || undefined,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        mediaUrls:     carouselImages.map((img) => img.url),
        contentPillar: form.contentPillar || undefined,
        assetLink:     form.assetLink.trim() || undefined,
        taggedPages:   taggedPageIds.length
          ? (selectedClient?.associatedPages ?? []).filter((p) => taggedPageIds.includes(p.id))
          : undefined,
      };
      const post = await createPost.mutateAsync(payload);
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to create post. Try again.');
    }
  }

  function field(key) {
    return {
      style: { ...inputStyle, borderColor: errors[key] ? '#dc2626' : 'rgba(0,0,0,0.12)' },
      onFocus: () => setErrors((prev) => ({ ...prev, [key]: undefined })),
    };
  }

  const isCarousel    = form.contentType === 'CAROUSEL';
  const firstImageUrl = carouselImages[0]?.url;

  return (
    <div style={{ maxWidth: 1024 }}>
      <div style={{ marginBottom: 24 }}>
        <p className="eyebrow">Content</p>
        <h2 style={{ margin: 0 }}>New Post</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
          Fill in the details and the post enters the planning queue.
        </p>
      </div>

      {/* Ideas panel */}
      {aiIdeas.open && (
        <div className="panel" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lightbulb size={14} /> Post ideas for {selectedClient?.name || 'your client'}
            </h3>
            <button type="button" onClick={() => setAiIdeas((s) => ({ ...s, open: false }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 2 }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {aiIdeas.list.map((idea, i) => (
              <button key={i} type="button"
                onClick={() => { setForm((f) => ({ ...f, title: idea.title })); setAiIdeas((s) => ({ ...s, open: false })); }}
                style={{
                  textAlign: 'left', background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 8, padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F0F0'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#FAFAFA'; }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{idea.title}</p>
                {idea.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{idea.description}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="panel" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }} noValidate>

        {/* Title + Ideas button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label>Post title *</Label>
            <button type="button" onClick={fetchIdeas} disabled={aiIdeas.loading || !form.clientId}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: aiIdeas.loading ? '#F0F0F0' : '#F5F5F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 980, padding: '3px 10px', fontSize: 11, fontWeight: 500, color: form.clientId ? '#3A3A3A' : 'var(--muted)', cursor: form.clientId ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
              title={form.clientId ? 'Get AI post ideas for this client' : 'Select a client first'}
            >
              {aiIdeas.loading ? <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Lightbulb size={10} />}
              {aiIdeas.loading ? 'Generating…' : 'Get Ideas'}
            </button>
          </div>
          {aiIdeas.error && <p style={{ margin: 0, fontSize: 11, color: '#dc2626' }}>{aiIdeas.error}</p>}
          <input
            value={form.title}
            onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((v) => ({ ...v, title: undefined })); }}
            placeholder="Right Hospitals — weekly health tips carousel"
            {...field('title')}
          />
          <FieldError msg={errors.title} />
        </div>

        {/* Client */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <Label>Client *</Label>
          <select
            value={form.clientId}
            onChange={(e) => { setForm((f) => ({ ...f, clientId: e.target.value })); setErrors((v) => ({ ...v, clientId: undefined })); }}
            style={{ ...selectStyle, borderColor: errors.clientId ? '#dc2626' : 'rgba(0,0,0,0.12)' }}
            onFocus={() => setErrors((v) => ({ ...v, clientId: undefined }))}
          >
            <option value="">Select client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <FieldError msg={errors.clientId} />
        </div>

        {/* Platforms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Label>Platforms *</Label>
            {selectedClient?.platforms?.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Showing {selectedClient.name}'s active platforms</span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {availablePlatforms.map((p) => {
              const selected = form.selectedPlatforms.includes(p.key);
              return (
                <button key={p.key} type="button" onClick={() => togglePlatform(p.key)} style={{
                  padding: '7px 15px', borderRadius: 999, fontSize: 13,
                  border: `1.5px solid ${selected ? '#111111' : 'rgba(0,0,0,0.12)'}`,
                  background: selected ? '#111111' : 'transparent',
                  color: selected ? '#fff' : 'var(--muted)',
                  cursor: 'pointer', fontWeight: selected ? 600 : 400,
                  transition: 'all 0.1s', display: 'flex', alignItems: 'center', gap: 5,
                  fontFamily: 'inherit',
                }}>
                  {selected && <span style={{ fontSize: 10 }}>✓</span>}
                  {p.label}
                </button>
              );
            })}
          </div>
          {errors.platforms && <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{errors.platforms}</p>}

          {/* Platform-specific format options */}
          {form.selectedPlatforms.some((p) => PLATFORM_FORMATS[p]) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, padding: '10px 14px', background: '#FAFAFA', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}>
              {form.selectedPlatforms.filter((p) => PLATFORM_FORMATS[p]).map((p) => (
                <div key={p} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {ALL_PLATFORMS.find((pl) => pl.key === p)?.label} format
                  </p>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {PLATFORM_FORMATS[p].map((fmt) => {
                      const active = form.platformFormats[p] === fmt;
                      return (
                        <button key={fmt} type="button"
                          onClick={() => setForm((f) => ({ ...f, platformFormats: { ...f.platformFormats, [p]: active ? undefined : fmt } }))}
                          style={{
                            padding: '4px 10px', borderRadius: 980, fontSize: 11,
                            border: `1px solid ${active ? '#111' : 'rgba(0,0,0,0.12)'}`,
                            background: active ? '#111' : 'transparent',
                            color: active ? '#fff' : 'var(--muted)',
                            cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 400,
                          }}
                        >
                          {fmt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Per-platform char status */}
          {form.selectedPlatforms.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {perPlatformStatus.map(({ key, label, limit, over }) => (
                <span key={key} style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 980, fontWeight: 500,
                  background: over ? '#FEF2F2' : '#F0F9F0',
                  color: over ? '#dc2626' : '#15803d',
                  border: `1px solid ${over ? '#FECACA' : '#BBF7D0'}`,
                }}>
                  {label}: {captionPlusHashtags.length}/{limit}{over && ' OVER'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Caption */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Label>Caption / Copy</Label>
            <span style={{ fontSize: 12, color: overLimit ? '#dc2626' : captionLen > minLimit * 0.9 ? '#d97706' : 'var(--muted)', fontWeight: overLimit ? 700 : 400 }}>
              {captionLen.toLocaleString()} / {minLimit.toLocaleString()}
              {form.selectedPlatforms.length > 1 && constraintPlatform && (
                <span style={{ fontWeight: 400, opacity: 0.7 }}> ({constraintPlatform.label} limit)</span>
              )}
            </span>
          </div>
          <Textarea
            value={form.caption}
            onChange={(e) => { setForm((f) => ({ ...f, caption: e.target.value })); setErrors((v) => ({ ...v, caption: undefined })); }}
            placeholder="Draft your social media copy here…"
            rows={6}
            style={overLimit ? { borderColor: '#dc2626' } : undefined}
          />
          <FieldError msg={errors.caption} />
        </div>

        {/* Hashtags + AI suggest */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label>Hashtags <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>(space-separated)</span></Label>
            <button type="button" onClick={suggestHashtags} disabled={aiHashtags.loading || (!form.caption && !form.title)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: aiHashtags.loading ? '#F0F0F0' : '#F5F5F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 980, padding: '3px 10px', fontSize: 11, fontWeight: 500, color: '#3A3A3A', cursor: (!form.caption && !form.title) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {aiHashtags.loading ? <Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Hash size={10} />}
              {aiHashtags.loading ? 'Generating…' : 'AI Suggest'}
            </button>
          </div>
          {aiHashtags.error && <p style={{ margin: 0, fontSize: 11, color: '#dc2626' }}>{aiHashtags.error}</p>}
          <input
            value={form.hashtags}
            onChange={(e) => setForm((f) => ({ ...f, hashtags: e.target.value }))}
            placeholder="#healthcare #wellness #doctorsofinstagram"
            style={inputStyle}
          />
        </div>

        {/* Content type + Category + Pillar + Assign + Schedule + Asset Link */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label>Content type</Label>
            <select value={form.contentType} onChange={(e) => setForm((f) => ({ ...f, contentType: e.target.value }))} style={selectStyle}>
              <option value="">Select type</option>
              {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label>Category</Label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={selectStyle}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label>Content pillar</Label>
              {selectedClient && !selectedClient?.strategy?.contentPillars?.length && (
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Set pillars in client strategy</span>
              )}
            </div>
            <select value={form.contentPillar} onChange={(e) => setForm((f) => ({ ...f, contentPillar: e.target.value }))} style={selectStyle}>
              <option value="">No pillar selected</option>
              {(selectedClient?.strategy?.contentPillars ?? []).map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label>Assign to</Label>
            <select value={form.assignedToId} onChange={(e) => setForm((f) => ({ ...f, assignedToId: e.target.value }))} style={selectStyle}>
              <option value="">Unassigned</option>
              {users.filter((u) => u.role !== 'CLIENT').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label>Scheduled date</Label>
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Label>Asset link <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12 }}>(Drive / Canva / Dropbox)</span></Label>
            <input
              value={form.assetLink}
              onChange={(e) => setForm((f) => ({ ...f, assetLink: e.target.value }))}
              placeholder="https://drive.google.com/…"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Collab & Tag Pages */}
        {(selectedClient?.associatedPages ?? []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label>Collab / Tag Pages</Label>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Select pages to tag or collaborate in this post</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {(selectedClient.associatedPages ?? []).map((page) => {
                const active = taggedPageIds.includes(page.id);
                const TYPE_COLOR = { Partner: '#2563EB', Influencer: '#9333EA', Brand: '#16A34A', Media: '#EA580C' };
                const color = TYPE_COLOR[page.type] ?? '#6B6B6B';
                return (
                  <button key={page.id} type="button"
                    onClick={() => setTaggedPageIds((ids) => active ? ids.filter((i) => i !== page.id) : [...ids, page.id])}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1.5px solid ${active ? color : 'rgba(0,0,0,0.1)'}`,
                      background: active ? `${color}12` : 'transparent',
                      color: active ? color : 'var(--muted)',
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.1s', fontWeight: active ? 600 : 400,
                    }}
                  >
                    {active && <span style={{ fontSize: 10 }}>✓</span>}
                    <span>{page.name}</span>
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{page.platform}</span>
                    <span style={{ fontSize: 10, padding: '0 4px', borderRadius: 4, background: active ? `${color}20` : 'transparent' }}>{page.type}</span>
                  </button>
                );
              })}
            </div>
            {taggedPageIds.length > 0 && (
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
                {taggedPageIds.length} page{taggedPageIds.length !== 1 ? 's' : ''} selected to tag / collaborate
              </p>
            )}
          </div>
        )}

        {/* Media / Carousel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label>
              {isCarousel ? 'Carousel Images' : 'Creative / Media'}
              {isCarousel && (
                <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                  Drag to reorder · {carouselImages.length}/20
                </span>
              )}
              {!isCarousel && (
                <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                  URLs (Drive, Canva, Dropbox)
                </span>
              )}
            </Label>
            <button type="button" onClick={() => setAiImage((s) => ({ ...s, open: !s.open, error: '' }))}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F5F5F5', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 980, padding: '3px 10px', fontSize: 11, fontWeight: 500, color: '#3A3A3A', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Sparkles size={10} /> AI Image
            </button>
          </div>

          {aiImage.open && (
            <div style={{ padding: '12px 14px', background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Describe the image — DALL-E 3 will generate it and add it to your media list.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={aiImage.prompt}
                  onChange={(e) => setAiImage((s) => ({ ...s, prompt: e.target.value }))}
                  placeholder="A modern hospital lobby with warm lighting and indoor plants…"
                  style={{ ...inputStyle, fontSize: 13 }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); generateImage(); } }}
                />
                <button type="button" onClick={generateImage} disabled={aiImage.loading || !aiImage.prompt.trim()} className="primary-button"
                  style={{ fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {aiImage.loading ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={12} />}
                  {aiImage.loading ? 'Generating…' : 'Generate'}
                </button>
              </div>
              {aiImage.error && <p style={{ margin: 0, fontSize: 11, color: '#dc2626' }}>{aiImage.error}</p>}
            </div>
          )}

          {isCarousel ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="carousel">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {carouselImages.map((img, index) => (
                      <Draggable key={img.id} draggableId={img.id} index={index}>
                        {(prov, snapshot) => (
                          <div ref={prov.innerRef} {...prov.draggableProps} style={{
                            ...prov.draggableProps.style,
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', background: snapshot.isDragging ? '#F5F5F5' : 'var(--bg)',
                            borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)',
                          }}>
                            <div {...prov.dragHandleProps} style={{ color: 'var(--muted-2)', cursor: 'grab', display: 'flex' }}>
                              <GripVertical size={14} />
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-2)', minWidth: 16 }}>{index + 1}</span>
                            {img.url.startsWith('http') && (
                              <img src={img.url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            )}
                            <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.url}</span>
                            <button type="button" onClick={() => removeCarouselImage(img.id)} style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 2, display: 'flex', borderRadius: 4 }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-2)'; }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          ) : (
            carouselImages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {carouselImages.map((img) => (
                  <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg)', borderRadius: 7, border: '1px solid rgba(0,0,0,0.07)' }}>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.url}</span>
                    <button type="button" onClick={() => removeCarouselImage(img.id)} style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', display: 'flex', padding: 2 }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {(!isCarousel || carouselImages.length < 20) && (
            <form onSubmit={addCarouselImage} style={{ display: 'flex', gap: 8 }}>
              <input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder={isCarousel ? 'Add image URL (Drive, Dropbox, Cloudinary…)' : 'Add media URL (Canva, Drive…)'}
                style={{ ...inputStyle, fontSize: 13 }}
              />
              <button type="submit" disabled={!newImageUrl.trim()} style={{ background: '#111', border: 'none', color: '#fff', borderRadius: 8, padding: '0 14px', fontSize: 13, cursor: newImageUrl.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', opacity: newImageUrl.trim() ? 1 : 0.5 }}>
                <Plus size={13} /> Add
              </button>
            </form>
          )}
          {isCarousel && carouselImages.length === 20 && (
            <p style={{ margin: 0, fontSize: 11, color: '#d97706' }}>Maximum 20 images per carousel reached.</p>
          )}
        </div>

        {/* Platform preview toggle */}
        {form.selectedPlatforms.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowPreview((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '7px 14px', fontSize: 13, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? 'Hide preview' : 'Preview on platforms'}
            </button>

            {showPreview && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 14 }}>
                {form.selectedPlatforms.map((p) => (
                  <PlatformPreviewCard key={p} platform={p} caption={form.caption} hashtags={form.hashtags} mediaUrl={firstImageUrl} clientName={selectedClient?.name} />
                ))}
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fca5a5' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{submitError}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button type="submit" disabled={createPost.isPending || overLimit} className="primary-button">
            {createPost.isPending ? 'Creating…' : 'Create Post'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
