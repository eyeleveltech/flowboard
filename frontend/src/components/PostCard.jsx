import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import PlatformBadge from './PlatformBadge';
import ClientAvatar from './ClientAvatar';

const CONTENT_TYPE_LABELS = {
  CAROUSEL: 'Carousel',
  REEL: 'Reel',
  STATIC_IMAGE: 'Static',
  VIDEO: 'Video',
  STORY: 'Story',
  THREAD: 'Thread',
  LONG_FORM: 'Long-form',
};

export default function PostCard({ post, compact = false }) {
  const navigate = useNavigate();

  return (
    <article
      className="panel"
      style={{ padding: compact ? '11px 14px' : '14px 18px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
      onClick={() => navigate(`/posts/${post.id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(0,113,227,0.35)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,113,227,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--panel-border)';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: compact ? 6 : 8 }}>
        {post.client && <ClientAvatar client={post.client} size={compact ? 24 : 28} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: compact ? 13 : 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {post.title}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{post.client?.name}</p>
        </div>
        <StatusBadge status={post.status} />
      </div>

      {!compact && post.caption && (
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 13,
            color: 'var(--muted)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {post.caption}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {(post.platforms ?? []).map((p) => <PlatformBadge key={p} platform={p} />)}
        {post.contentType && (
          <span style={{
            fontSize: 11, color: 'var(--muted-2)',
            background: 'var(--fill)', borderRadius: 4,
            padding: '1px 6px', fontWeight: 500,
          }}>
            {CONTENT_TYPE_LABELS[post.contentType] ?? post.contentType}
          </span>
        )}
        {post.assignedTo && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {post.assignedTo.name}
          </span>
        )}
        {post.scheduledAt && (
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
            {new Date(post.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        )}
        {post._count && (
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: post.scheduledAt ? 0 : 'auto' }}>
            {post._count?.checklistItems ?? 0} tasks · {post._count?.comments ?? 0} notes
          </span>
        )}
      </div>
    </article>
  );
}
