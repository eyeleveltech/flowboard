import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '@/lib/api';

export default function LinkInBio() {
  const { slug } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/bio/${slug}`)
      .then((res) => { setData(res.data); setLoading(false); })
      .catch((err) => {
        setError(err.response?.data?.error || 'Page not found.');
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F8F8' }}>
        <p style={{ color: '#ADADAD', fontSize: 14 }}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8F8F8', gap: 10 }}>
        <p style={{ color: '#3A3A3A', fontSize: 18, fontWeight: 700, margin: 0 }}>404</p>
        <p style={{ color: '#ADADAD', fontSize: 14, margin: 0 }}>{error}</p>
      </div>
    );
  }

  const accent = data.color ?? '#111111';
  const links  = Array.isArray(data.bioLinks) ? data.bioLinks : [];

  return (
    <div style={{
      minHeight: '100vh', background: '#F7F7F7',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 20px 80px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Brand card */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* Logo / Avatar */}
        {data.logoUrl ? (
          <img src={data.logoUrl} alt={data.name} style={{ width: 72, height: 72, borderRadius: 18, objectFit: 'cover', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: 18, background: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 28, marginBottom: 14,
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          }}>
            {data.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Title + description */}
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#1A1A1A', textAlign: 'center', letterSpacing: '-0.5px' }}>
          {data.bioTitle || data.name}
        </h1>
        {data.bioDescription && (
          <p style={{ margin: '0 0 28px', fontSize: 14, color: '#6B6B6B', textAlign: 'center', lineHeight: 1.55, maxWidth: 360 }}>
            {data.bioDescription}
          </p>
        )}
        {!data.bioDescription && <div style={{ height: 28 }} />}

        {/* Links */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map((link, i) => (
            <LinkButton key={i} label={link.label} url={link.url} accent={accent} />
          ))}
        </div>

        {links.length === 0 && (
          <p style={{ fontSize: 13, color: '#ADADAD', textAlign: 'center', marginTop: 20 }}>No links configured yet.</p>
        )}

        {/* Powered by */}
        <p style={{ marginTop: 48, fontSize: 11, color: '#C0C0C0', textAlign: 'center' }}>
          Powered by FlowBoard · EyeLevel Growth Studio
        </p>
      </div>
    </div>
  );
}

function LinkButton({ label, url, accent }) {
  const [hover, setHover] = useState(false);

  return (
    <a
      href={url.startsWith('http') ? url : `https://${url}`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '15px 20px',
        borderRadius: 12,
        background: hover ? accent : '#fff',
        color: hover ? '#fff' : '#1A1A1A',
        fontWeight: 600,
        fontSize: 15,
        textAlign: 'center',
        textDecoration: 'none',
        border: `1.5px solid ${hover ? accent : 'rgba(0,0,0,0.08)'}`,
        boxShadow: hover ? `0 4px 16px ${accent}40` : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
        letterSpacing: '-0.1px',
      }}
    >
      {label}
    </a>
  );
}
