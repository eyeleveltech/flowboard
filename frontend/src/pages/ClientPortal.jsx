import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePosts, useUpdatePost } from '@/hooks/usePosts';
import { disconnectSocket } from '@/lib/socket';
import { SkeletonCard } from '@/components/Skeleton';

export default function ClientPortal() {
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [actioningId, setActioningId] = useState(null);
  const [noteMap, setNoteMap]         = useState({});
  const [doneMap, setDoneMap]         = useState({});

  const { data, isLoading } = usePosts({
    clientId: user?.clientId,
    status:   'APPROVED',
    limit:    50,
  });

  const updatePost = useUpdatePost();
  const posts = data?.posts ?? [];

  function handleLogout() {
    disconnectSocket();
    logout();
    navigate('/login');
  }

  async function act(postId, action) {
    setActioningId(postId);
    try {
      const updates = {
        status: action === 'approve' ? 'CLIENT_APPROVED' : 'DRAFT',
      };
      if (noteMap[postId]?.trim()) {
        // store note in caption suffix or trigger a comment — simplified: pass as internalNote
        updates._clientNote = noteMap[postId].trim();
      }
      await updatePost.mutateAsync({ id: postId, ...updates });
      setDoneMap((m) => ({ ...m, [postId]: action }));
    } catch {
      /* noop */
    } finally {
      setActioningId(null);
    }
  }

  const pending  = posts.filter((p) => !doneMap[p.id]);
  const actioned = posts.filter((p) => doneMap[p.id]);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif' }}>
      {/* Topbar */}
      <header style={{
        height: 52, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 10,
        backdropFilter: 'blur(16px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: '#111111',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 11,
          }}>EL</div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
              {user?.client?.name ?? 'Content Portal'}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#6B6B6B', lineHeight: 1.2 }}>EyeLevel Growth Studio</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: '#6B6B6B' }}>Hello, {user?.name?.split(' ')[0]}</span>
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 8,
              color: '#6B6B6B', cursor: 'pointer', fontSize: 12, padding: '5px 11px',
              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
            }}
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B6B6B' }}>
            Content Review
          </p>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#111', letterSpacing: '-0.4px' }}>
            Posts waiting for your approval
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#6B6B6B' }}>
            Review each post below. Approve it to allow scheduling, or send it back for changes.
          </p>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} rows={3} />)}
          </div>
        ) : pending.length === 0 && actioned.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.1)',
            padding: '56px 32px', textAlign: 'center',
          }}>
            <CheckCircle size={32} color="#ADADAD" style={{ marginBottom: 14 }} />
            <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 16, color: '#111' }}>You are all caught up</p>
            <p style={{ margin: 0, fontSize: 14, color: '#6B6B6B' }}>
              No posts are waiting for your review right now. Check back later.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pending.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                note={noteMap[post.id] ?? ''}
                onNoteChange={(v) => setNoteMap((m) => ({ ...m, [post.id]: v }))}
                onApprove={() => act(post.id, 'approve')}
                onChanges={() => act(post.id, 'changes')}
                loading={actioningId === post.id}
              />
            ))}

            {actioned.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ADADAD', margin: '0 0 10px' }}>
                  Reviewed this session
                </p>
                {actioned.map((post) => (
                  <div key={post.id} style={{
                    background: '#fff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
                    padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 8, opacity: 0.7,
                  }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#3A3A3A' }}>{post.title}</p>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                      background: doneMap[post.id] === 'approve' ? '#111' : '#F0F0F0',
                      color: doneMap[post.id] === 'approve' ? '#fff' : '#6B6B6B',
                    }}>
                      {doneMap[post.id] === 'approve' ? 'Approved' : 'Sent back'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, note, onNoteChange, onApprove, onChanges, loading }) {
  const [expanded, setExpanded] = useState(true);
  const platforms = Array.isArray(post.platforms) ? post.platforms : [];

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.1)',
      overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Post header */}
      <div
        style={{
          padding: '18px 22px 14px', cursor: 'pointer',
          borderBottom: expanded ? '1px solid rgba(0,0,0,0.08)' : 'none',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111', letterSpacing: '-0.3px' }}>{post.title}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {platforms.map((p) => (
                <span key={p} style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
                  background: '#F0F0F0', color: '#3A3A3A', letterSpacing: '0.02em',
                }}>
                  {p}
                </span>
              ))}
              {post.scheduledAt && (
                <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                  Scheduled: {new Date(post.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <span style={{ fontSize: 18, color: '#ADADAD', lineHeight: 1, flexShrink: 0 }}>
            {expanded ? '−' : '+'}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '18px 22px' }}>
          {/* Caption */}
          {post.caption && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ADADAD' }}>Caption</p>
              <p style={{
                margin: 0, fontSize: 14, color: '#3A3A3A', lineHeight: 1.6,
                whiteSpace: 'pre-wrap', background: '#FAFAFA', borderRadius: 10,
                padding: '12px 14px', border: '1px solid rgba(0,0,0,0.07)',
              }}>
                {post.caption}
              </p>
            </div>
          )}

          {/* Media URLs */}
          {post.mediaUrls?.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ADADAD' }}>Creative Files</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {post.mediaUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{
                    fontSize: 13, color: '#111', textDecoration: 'none',
                    padding: '7px 12px', background: '#F5F5F5', borderRadius: 8,
                    border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {url}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Feedback note */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#ADADAD' }}>
              Feedback (optional)
            </p>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="If you're sending this back for changes, describe what needs to be updated..."
              rows={3}
              style={{
                width: '100%', resize: 'vertical', fontFamily: 'inherit',
                background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.12)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#111',
                outline: 'none', letterSpacing: '-0.1px', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onApprove}
              disabled={loading}
              style={{
                flex: 1, padding: '10px 20px', borderRadius: 999, border: 'none',
                background: '#111111', color: '#fff', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: loading ? 0.5 : 1, transition: 'background 0.1s',
              }}
            >
              <CheckCircle size={15} /> Approve
            </button>
            <button
              onClick={onChanges}
              disabled={loading}
              style={{
                flex: 1, padding: '10px 20px', borderRadius: 999,
                border: '1.5px solid rgba(0,0,0,0.15)', background: '#fff',
                color: '#3A3A3A', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                opacity: loading ? 0.5 : 1, transition: 'background 0.1s',
              }}
            >
              <XCircle size={15} /> Request changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
