import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, CheckSquare,
  Settings, FilePlus, LogOut, FileText, Menu, X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import NotificationBell from './NotificationBell';
import ErrorBoundary from './ErrorBoundary';
import { disconnectSocket } from '@/lib/socket';
import { usePosts } from '@/hooks/usePosts';

const ADMIN_NAV = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/clients',   label: 'Clients',   Icon: Users },
  { to: '/posts',     label: 'Posts',     Icon: FileText },
  { to: '/calendar',  label: 'Calendar',  Icon: Calendar },
  { to: '/approvals', label: 'Approvals', Icon: CheckSquare, badgeKey: 'approvals' },
  { to: '/settings',  label: 'Settings',  Icon: Settings },
];

const CLIENT_NAV = [
  { to: '/calendar',  label: 'Calendar',  Icon: Calendar },
  { to: '/posts',     label: 'Posts',     Icon: FileText },
  { to: '/approvals', label: 'Approvals', Icon: CheckSquare, badgeKey: 'client-approvals' },
  { to: '/settings',  label: 'Profile',   Icon: Settings },
];

function SidebarContent({ onNavClick }) {
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);
  const navigate  = useNavigate();
  const isClient  = user?.role === 'CLIENT';

  // Admin: badge = posts in REVIEW needing internal approval
  const { data: reviewData } = usePosts({ status: 'REVIEW', limit: 1 });
  // Client: badge = posts in APPROVED needing their sign-off (only fetched when user is CLIENT)
  const { data: clientApprData } = usePosts(
    { status: 'APPROVED', clientId: user?.clientId ?? '', limit: 1 },
    { enabled: isClient }
  );

  const navItems   = isClient ? CLIENT_NAV : ADMIN_NAV;
  const brandLabel = isClient ? (user?.client?.name ?? 'Content Portal') : 'FlowBoard';
  const subLabel   = isClient ? 'EyeLevel Growth Studio' : 'by EyeLevel';

  function handleLogout() {
    disconnectSocket();
    logout();
    navigate('/login');
  }

  return (
    <>
      <div>
        {/* Brand */}
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: '#111111',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            }}>
              {isClient ? (user?.client?.name?.charAt(0)?.toUpperCase() ?? 'C') : 'FB'}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '-0.4px' }}>{brandLabel}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)', lineHeight: 1.2 }}>{subLabel}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="nav-list" aria-label="Primary">
          {navItems.map(({ to, label, Icon, badgeKey }) => {
            const badge = badgeKey === 'approvals'
              ? (reviewData?.total ?? 0)
              : badgeKey === 'client-approvals'
              ? (clientApprData?.total ?? 0)
              : 0;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onNavClick}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}
              >
                <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && (
                  <span style={{
                    background: '#111111', color: '#fff',
                    borderRadius: 10, fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', lineHeight: '16px', minWidth: 18,
                    textAlign: 'center',
                  }}>
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div>
        {/* New Post button — admin/team only */}
        {!isClient && (
          <NavLink to="/posts/new" style={{ textDecoration: 'none' }} onClick={onNavClick}>
            <button
              type="button"
              className="primary-button"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 16, gap: 7 }}
            >
              <FilePlus size={15} strokeWidth={2.5} />
              New Post
            </button>
          </NavLink>
        )}

        <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: '#111111',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>
                {isClient ? 'Client' : user?.role?.replace(/_/g, ' ').toLowerCase()}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{
                background: 'none', border: '1px solid rgba(0,0,0,0.1)', color: 'var(--muted)', cursor: 'pointer',
                padding: '5px 7px', borderRadius: 7, display: 'flex', alignItems: 'center',
              }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const drawerRef = useRef(null);
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    if (!mobileNavOpen) return;
    function handler(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setMobileNavOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileNavOpen]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <SidebarContent onNavClick={undefined} />
      </aside>

      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 40, backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 260,
          background: '#fff', zIndex: 50, padding: '16px 10px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          borderRight: '1px solid var(--separator)',
          transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: mobileNavOpen ? '4px 0 24px rgba(0,0,0,0.12)' : 'none',
        }}
        className="mobile-sidebar"
      >
        <SidebarContent onNavClick={() => setMobileNavOpen(false)} />
      </div>

      <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)', minWidth: 0 }}>
        <header className="topbar-outer">
          {/* Hamburger — only on mobile */}
          <button
            className="hamburger"
            onClick={() => setMobileNavOpen((v) => !v)}
            style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              cursor: 'pointer', padding: 6, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Menu"
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Centre brand label — desktop hidden (sidebar shows it), mobile shown */}
          <div className="topbar-brand" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>FlowBoard</span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>EyeLevel Growth Studio</span>
          </div>

          <ErrorBoundary fallback={
            <div style={{ padding: '4px 8px', fontSize: 12, color: 'var(--muted)' }}>
              Notifications unavailable
            </div>
          }>
            <NotificationBell />
          </ErrorBoundary>
        </header>

        <div style={{ flex: 1, padding: '24px 28px' }} className="main-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
