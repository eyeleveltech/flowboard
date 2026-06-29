import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, CheckSquare,
  Settings, FilePlus, LogOut, FileText, Menu, X, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import NotificationBell from './NotificationBell';
import ErrorBoundary from './ErrorBoundary';
import CommandPalette from './CommandPalette';
import { disconnectSocket } from '@/lib/socket';
import { usePosts } from '@/hooks/usePosts';
import logoImg from '@/assets/eyelevel-logo-white.png';

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

function SidebarContent({ onNavClick, isCollapsed, setIsCollapsed }) {
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
  const brandLabel = isClient ? (user?.client?.name ?? 'Content Portal') : 'Flow Board';
  const subLabel   = isClient ? 'EyeLevel Growth Studio' : '';

  function handleLogout() {
    disconnectSocket();
    logout();
    navigate('/login');
  }

  return (
    <>
      <div>
        {/* Brand */}
        <div style={{ marginBottom: 8, paddingBottom: 16, borderBottom: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isClient ? (
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: '#111111',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '-0.5px', flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              }}>
                {user?.client?.name?.charAt(0)?.toUpperCase() ?? 'C'}
              </div>
            ) : (
              <img 
                src={logoImg} 
                alt="EyeLevel" 
                style={{ 
                  height: 32,
                  width: 'auto',
                  objectFit: 'contain', 
                  flexShrink: 0,
                  filter: 'brightness(0)'
                }} 
              />
            )}
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
                style={{ 
                  textDecoration: 'none', display: 'flex', alignItems: 'center', 
                  gap: 9, justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? '12px 0' : '7px 10px'
                }}
              >
                <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span style={{ flex: 1 }}>{label}</span>}
                {!isCollapsed && badge > 0 && (
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
              style={{ width: '100%', justifyContent: 'center', marginBottom: 16, gap: 7, padding: isCollapsed ? '10px 0' : '10px 16px' }}
            >
              <FilePlus size={15} strokeWidth={2.5} />
              {!isCollapsed && "New Post"}
            </button>
          </NavLink>
        )}

        <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {setIsCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px', fontSize: 13, fontWeight: 500,
                justifyContent: isCollapsed ? 'center' : 'flex-start', width: '100%', marginBottom: 8
              }}
            >
              {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              {!isCollapsed && "Collapse"}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#E6F4FF', color: '#0958D9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, flexShrink: 0, letterSpacing: '-0.3px'
            }}>
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'JR'}
            </div>
            {!isCollapsed && (
              <>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'Jaya Raman'}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email || 'jai.eyelevel@gmail.com'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  style={{
                    background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                    padding: 4, display: 'flex', alignItems: 'center',
                  }}
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const drawerRef = useRef(null);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

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
    <div className="app-shell" data-collapsed={isCollapsed}>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <SidebarContent onNavClick={undefined} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
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

          {/* Centre brand label removed */}
          <div style={{ flex: 1 }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ErrorBoundary fallback={
              <div style={{ padding: '4px 8px', fontSize: 12, color: 'var(--muted)' }}>
                Notifications unavailable
              </div>
            }>
              <NotificationBell />
            </ErrorBoundary>
            
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: 6, 
              cursor: 'pointer', padding: '2px', borderRadius: 20
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: '#E6F4FF', color: '#0958D9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14, letterSpacing: '-0.3px'
              }}>
                {user?.name ? user.name.substring(0, 2).toUpperCase() : 'JR'}
              </div>
              <ChevronDown size={14} color="var(--muted)" />
            </div>
          </div>
        </header>

        <div style={{ flex: 1, padding: '24px 28px' }} className="main-content">
          <Outlet />
        </div>
      </main>
      <CommandPalette />
    </div>
  );
}
