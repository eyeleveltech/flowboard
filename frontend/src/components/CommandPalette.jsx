import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, FileText, Calendar, Users, Settings, CheckSquare, FilePlus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const isClient = user?.role === 'CLIENT';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build commands
  const commands = [];
  
  if (!isClient) {
    commands.push({ id: 'dashboard', name: 'Go to Dashboard', icon: LayoutDashboard, route: '/dashboard' });
    commands.push({ id: 'clients', name: 'Manage Clients', icon: Users, route: '/clients' });
  }
  
  commands.push({ id: 'posts', name: 'View all Posts', icon: FileText, route: '/posts' });
  
  if (!isClient) {
    commands.push({ id: 'new-post', name: 'Create New Post', icon: FilePlus, route: '/posts/new' });
    commands.push({ id: 'approvals', name: 'Review Approvals', icon: CheckSquare, route: '/approvals' });
  } else {
    commands.push({ id: 'approvals', name: 'My Approvals', icon: CheckSquare, route: '/approvals' });
  }

  commands.push({ id: 'calendar', name: 'Content Calendar', icon: Calendar, route: '/calendar' });
  commands.push({ id: 'settings', name: 'Account Settings', icon: Settings, route: '/settings' });

  const filteredCommands = commands.filter((cmd) => 
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handleNavigation = (e) => {
      if (filteredCommands.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          navigate(filteredCommands[selectedIndex].route);
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleNavigation);
    return () => document.removeEventListener('keydown', handleNavigation);
  }, [open, filteredCommands, selectedIndex, navigate]);

  if (!open) return null;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 99999, 
        background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '10vh'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div 
        style={{
          width: '100%', maxWidth: 550, background: 'var(--panel)',
          borderRadius: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          border: '1px solid var(--panel-border)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          animation: 'command-palette-slide 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--panel-border)' }}>
          <Search size={20} color="var(--muted)" style={{ marginRight: 12 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands or jump to..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 16, color: 'var(--text)', fontFamily: 'inherit'
            }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <kbd style={{ fontSize: 11, padding: '2px 6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--muted)', fontWeight: 600 }}>ESC</kbd>
          </div>
        </div>

        <div style={{ padding: 12, maxHeight: 350, overflowY: 'auto' }}>
          {filteredCommands.length === 0 ? (
            <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              No commands found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 12px 4px' }}>
                Suggestions
              </div>
              {filteredCommands.map((cmd, index) => {
                const isActive = index === selectedIndex;
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.id}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={() => {
                      navigate(cmd.route);
                      setOpen(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '12px 16px',
                      borderRadius: 8, cursor: 'pointer',
                      background: isActive ? 'var(--fill)' : 'transparent',
                      color: isActive ? 'var(--text)' : 'var(--muted-2)',
                      transition: 'background 0.1s', gap: 12
                    }}
                  >
                    <Icon size={18} color={isActive ? 'var(--text)' : 'var(--muted)'} />
                    <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{cmd.name}</span>
                    {isActive && (
                      <kbd style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Enter</kbd>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes command-palette-slide {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
