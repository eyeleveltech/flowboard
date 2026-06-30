import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { useNotifications, useMarkAllRead } from '@/hooks/useNotifications';
import { connectSocket } from '@/lib/socket';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { data: notifications = [] } = useNotifications();
  const markAll = useMarkAllRead();
  const qc = useQueryClient();
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const socket = connectSocket();
    socket.on('notification:new', () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => socket.off('notification:new');
  }, [qc]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative', background: 'transparent', border: 'none',
          color: 'var(--muted-2)', cursor: 'pointer', padding: 8,
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s'
        }}
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            width: 18, height: 18, borderRadius: '50%',
            background: '#EF4444', color: '#fff',
            fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, border: '2px solid var(--bg)',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, background: '#fff',
          borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.07)',
          zIndex: 50, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px 11px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111111' }}>
              Notifications {unread > 0 && <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({unread} new)</span>}
            </p>
            {unread > 0 && (
              <button
                onClick={() => { markAll.mutate(); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: '#111111', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'inherit',
                }}
              >
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                <Bell size={18} color="var(--muted-2)" style={{ marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 12).map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '11px 16px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    background: n.read ? 'transparent' : 'rgba(0,0,0,0.02)',
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                  }}
                >
                  {!n.read && (
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', background: '#111111',
                      flexShrink: 0, marginTop: 5,
                    }} />
                  )}
                  <div style={{ flex: 1, paddingLeft: n.read ? 16 : 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: n.read ? 400 : 500, color: '#111111', lineHeight: 1.4 }}>
                      {n.payload?.postTitle || n.type}
                    </p>
                    {n.payload?.clientName && (
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                        {n.payload.clientName}
                      </p>
                    )}
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--muted-2)' }}>
                      {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
