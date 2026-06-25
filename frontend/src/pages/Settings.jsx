import { useState } from 'react';
import {
  Shield, Users, ArrowDown, Plus, Trash2, CheckCircle,
  PenLine, Eye, UserCheck, CalendarClock, Send, Mail,
  Key, User, Building2, Phone, Briefcase, ChevronDown,
  Globe, Lock, AlertCircle, RotateCcw, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  useUsers, useCreateUser, useDeleteUser, useInviteClient,
  useUpdateUser, useResetUserPassword, useUpdateProfile, useChangePassword,
} from '@/hooks/useUsers';
import { useClients } from '@/hooks/useClients';
import { useAuthStore } from '@/stores/authStore';
import { SkeletonCard } from '@/components/Skeleton';

/* ─── Role metadata ───────────────────────────────────────────────────────── */

const ROLES = [
  {
    value: 'SUPER_ADMIN',
    label: 'Super Admin',
    badge: { bg: '#000000', color: '#fff' },
    desc: 'Full system access — billing, all settings, can promote/demote any user.',
    perms: [
      'Everything Admin can do',
      'Promote any user to any role',
      'Manage billing and system settings',
      'Delete clients and all associated data',
    ],
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    badge: { bg: '#111111', color: '#fff' },
    desc: 'Manage team, clients, and all content workflows.',
    perms: [
      'Add, edit, and remove team members',
      'Invite client portal users',
      'Approve, reject, and schedule all posts',
      'Configure approval workflows',
      'Access all clients and posts',
    ],
  },
  {
    value: 'ADMIN_MANAGER',
    label: 'Admin Manager',
    badge: { bg: '#3A3A3A', color: '#fff' },
    desc: 'Reviews content and manages day-to-day delivery for assigned clients.',
    perms: [
      'Approve or reject posts at internal review',
      'Mark client approval on behalf of client',
      'Schedule and publish posts',
      'View all clients and posts',
    ],
  },
  {
    value: 'USER',
    label: 'User',
    badge: { bg: '#EBEBEB', color: '#3A3A3A' },
    desc: 'Creates and submits content for review.',
    perms: [
      'Create and edit posts',
      'Submit posts for internal review',
      'View post status and comments',
      'Cannot approve, schedule, or manage team',
    ],
  },
  {
    value: 'CLIENT',
    label: 'Client',
    badge: { bg: '#F0F0F0', color: '#6B6B6B', border: '1px solid rgba(0,0,0,0.1)' },
    desc: 'Client-facing portal access — views and approves their posts only.',
    perms: [
      'View posts created for their brand',
      'Approve or request changes on posts at client review stage',
      'Cannot see other clients, team members, or internal notes',
    ],
  },
];

const LEGACY_ROLE_MAP = { MANAGER: 'ADMIN_MANAGER', EDITOR: 'USER' };

function resolveRole(rawRole) {
  return LEGACY_ROLE_MAP[rawRole] ?? rawRole;
}

function getRoleMeta(rawRole) {
  const key = resolveRole(rawRole);
  return ROLES.find((r) => r.value === key) ?? ROLES[3];
}

function RoleBadge({ role }) {
  const meta = getRoleMeta(role);
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 980,
      background: meta.badge.bg, color: meta.badge.color,
      border: meta.badge.border ?? 'none',
    }}>
      {meta.label}
    </span>
  );
}

const PIPELINE_STAGES = [
  { icon: PenLine,      title: 'Content Creation',  role: 'USER',         desc: 'User drafts the post — caption, visuals, hashtags, platforms.',         color: '#F0F0F0', textColor: '#3A3A3A' },
  { icon: Eye,          title: 'Internal Review',   role: 'ADMIN_MANAGER', desc: 'Admin Manager or Admin reviews and approves or requests changes.',      color: '#D6D6D6', textColor: '#1A1A1A' },
  { icon: UserCheck,    title: 'Client Approval',   role: 'CLIENT',        desc: 'Sent to the client portal for sign-off before scheduling.', color: '#4A4A4A', textColor: '#fff', optional: true },
  { icon: CalendarClock,title: 'Scheduling',         role: 'ADMIN_MANAGER', desc: 'Approved post is assigned a date and time for publishing.',             color: '#111111', textColor: '#fff' },
  { icon: Send,         title: 'Published',          role: 'SYSTEM',        desc: 'Post goes live. Status marked Published.',                              color: '#000000', textColor: '#fff' },
];

const inputStyle = {
  background: '#FAFAFA', border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 8, padding: '8px 12px', fontSize: 14,
  color: 'var(--text)', fontFamily: 'inherit', outline: 'none', width: '100%',
};
const selectStyle = { ...inputStyle };

/* ─── Section nav ─────────────────────────────────────────────────────────── */

const ALL_SECTIONS = [
  { id: 'team',         label: 'Team',               icon: Users,   roles: ['SUPER_ADMIN', 'ADMIN', 'ADMIN_MANAGER', 'MANAGER'] },
  { id: 'client-access', label: 'Client Access',     icon: Globe,   roles: ['SUPER_ADMIN', 'ADMIN'] },
  { id: 'hierarchy',    label: 'Approval Hierarchy', icon: Shield,  roles: ['SUPER_ADMIN', 'ADMIN', 'ADMIN_MANAGER', 'MANAGER'] },
  { id: 'profile',      label: 'Your Profile',       icon: User,    roles: null },
];

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function Settings() {
  const currentUser      = useAuthStore((s) => s.user);
  const setUser          = useAuthStore((s) => s.login);
  const token            = useAuthStore((s) => s.token);

  const { data: users = [], isLoading } = useUsers();
  const { data: clients = [] }          = useClients();
  const createUser    = useCreateUser();
  const deleteUser    = useDeleteUser();
  const inviteClient  = useInviteClient();
  const updateUser    = useUpdateUser();
  const resetPassword = useResetUserPassword();
  const updateProfile = useUpdateProfile();
  const changePassword= useChangePassword();

  const isClientRole = currentUser?.role === 'CLIENT';
  const [section, setSection]   = useState(isClientRole || currentUser?.role === 'USER' ? 'profile' : 'team');
  const [addOpen, setAddOpen]   = useState(false);
  const [addForm, setAddForm]   = useState({ name: '', email: '', password: '', role: 'USER', department: '', jobTitle: '', clientId: '' });
  const [addError, setAddError] = useState('');

  // Profile state
  const [profile, setProfile] = useState({
    name: currentUser?.name ?? '',
    phone: currentUser?.phone ?? '',
    jobTitle: currentUser?.jobTitle ?? '',
    department: currentUser?.department ?? '',
    bio: currentUser?.bio ?? '',
  });
  const [profileMsg, setProfileMsg] = useState('');

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');

  // Role edit state
  const [editRoleId, setEditRoleId] = useState(null);

  const isFullAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role);
  const isAdmin     = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_MANAGER', 'MANAGER'].includes(currentUser?.role);
  const SECTIONS    = ALL_SECTIONS.filter((s) => s.roles === null || s.roles.includes(currentUser?.role));

  /* ── Handlers ── */

  async function handleCreate(e) {
    e.preventDefault();
    setAddError('');
    try {
      if (addForm.role === 'CLIENT') {
        if (!addForm.clientId) { setAddError('Please select a client brand.'); return; }
        await inviteClient.mutateAsync({ name: addForm.name, email: addForm.email, password: addForm.password, clientId: addForm.clientId });
      } else {
        await createUser.mutateAsync(addForm);
      }
      setAddOpen(false);
      setAddForm({ name: '', email: '', password: '', role: 'USER', department: '', jobTitle: '', clientId: '' });
    } catch (err) {
      setAddError(err.response?.data?.error || 'Failed to create user');
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Remove ${name} from the team? This cannot be undone.`)) return;
    await deleteUser.mutateAsync(id);
  }

  async function handleRoleChange(userId, newRole) {
    await updateUser.mutateAsync({ id: userId, role: newRole });
    setEditRoleId(null);
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    try {
      const updated = await updateProfile.mutateAsync(profile);
      setUser(token, { ...currentUser, ...updated });
      setProfileMsg('Profile saved.');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('Failed to save. Try again.');
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwMsg('');
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg("New passwords don't match."); return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg('Password must be at least 6 characters.'); return;
    }
    try {
      await changePassword.mutateAsync({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setPwMsg('Password changed successfully.');
      setTimeout(() => setPwMsg(''), 4000);
    } catch (err) {
      setPwMsg(err.response?.data?.error || 'Failed to change password.');
    }
  }

  /* ── Role hierarchy sorted display ── */
  const ROLE_ORDER = ['SUPER_ADMIN', 'ADMIN', 'ADMIN_MANAGER', 'MANAGER', 'USER', 'EDITOR', 'CLIENT'];
  const sortedUsers = [...users].sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a.role);
    const bi = ROLE_ORDER.indexOf(b.role);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
  });

  const clientUsers = users.filter((u) => u.role === 'CLIENT');
  const teamUsers   = users.filter((u) => u.role !== 'CLIENT');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <p className="eyebrow">{isClientRole ? 'Account' : 'Admin'}</p>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 3 }}>
          {isClientRole
            ? 'Update your profile and change your password.'
            : 'Manage your team, client access, approvals, and account.'}
        </p>
      </div>

      {/* Section nav */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: 0 }}>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: '8px 8px 0 0',
              border: 'none',
              background: section === id ? 'var(--panel)' : 'transparent',
              color: section === id ? 'var(--text)' : 'var(--muted)',
              fontWeight: section === id ? 600 : 400,
              fontSize: 13, cursor: 'pointer',
              borderBottom: section === id ? '2px solid #111111' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── TEAM ─────────────────────────────────────────────────────────── */}
      {section === 'team' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Team Members</h3>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                {teamUsers.length} member{teamUsers.length !== 1 ? 's' : ''}
              </p>
            </div>
            {isFullAdmin && (
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <button className="primary-button" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Plus size={14} /> Add Member
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{addForm.role === 'CLIENT' ? 'Invite Client' : 'Add Team Member'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Role picker — top, drives what fields show below */}
                    <div>
                      <Label>Role *</Label>
                      <select
                        value={addForm.role}
                        onChange={(e) => setAddForm({ ...addForm, role: e.target.value, clientId: '', department: '', jobTitle: '' })}
                        style={selectStyle}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      {addForm.role === 'CLIENT' && (
                        <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                          Client users can view their calendar, posts, and approve content sent to them.
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <Label>Full name *</Label>
                        <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder={addForm.role === 'CLIENT' ? 'Dr. Kavya Somesh' : 'Jane Doe'} required style={inputStyle} />
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <input type="email" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} placeholder={addForm.role === 'CLIENT' ? 'kavya@righthospitals.in' : 'jane@company.com'} required style={inputStyle} />
                      </div>
                    </div>

                    {/* Brand picker — only for CLIENT role */}
                    {addForm.role === 'CLIENT' && (
                      <div>
                        <Label>Client brand *</Label>
                        <select
                          value={addForm.clientId}
                          onChange={(e) => setAddForm({ ...addForm, clientId: e.target.value })}
                          required style={selectStyle}
                        >
                          <option value="">Select a client brand</option>
                          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}

                    {/* Job title + Department — team members only */}
                    {addForm.role !== 'CLIENT' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <Label>Job title</Label>
                          <input value={addForm.jobTitle} onChange={(e) => setAddForm({ ...addForm, jobTitle: e.target.value })} placeholder="Content Strategist" style={inputStyle} />
                        </div>
                        <div>
                          <Label>Department</Label>
                          <input value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} placeholder="Design" style={inputStyle} />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Temporary password *</Label>
                      <input type="password" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} placeholder="Min. 6 characters" required style={inputStyle} />
                      {addForm.role === 'CLIENT' && (
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted-2)' }}>Share this with the client — they can change it later from their profile.</p>
                      )}
                    </div>

                    {addError && <p style={{ margin: 0, fontSize: 13, color: 'var(--danger)' }}>{addError}</p>}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setAddError(''); }}>Cancel</Button>
                      <Button type="submit" disabled={createUser.isPending || inviteClient.isPending}>
                        {(createUser.isPending || inviteClient.isPending)
                          ? (addForm.role === 'CLIENT' ? 'Inviting...' : 'Adding...')
                          : (addForm.role === 'CLIENT' ? 'Invite Client' : 'Add Member')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map((i) => <SkeletonCard key={i} rows={1} />)}
            </div>
          ) : (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 180px 120px 80px',
                padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#FAFAFA',
              }}>
                {['Member', 'Role', 'Department', 'Joined', ''].map((h) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {sortedUsers.filter((u) => u.role !== 'CLIENT').map((user, i, arr) => (
                <div key={user.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 180px 120px 80px',
                  padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  alignItems: 'center',
                  background: user.id === currentUser?.id ? '#FAFAFA' : 'transparent',
                }}>
                  {/* Member */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: '#EBEBEB', border: '1px solid rgba(0,0,0,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#3A3A3A', flexShrink: 0,
                    }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                        {user.name}
                        {user.id === currentUser?.id && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>you</span>}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{user.email}</p>
                      {user.jobTitle && <p style={{ margin: 0, fontSize: 11, color: 'var(--muted-2)' }}>{user.jobTitle}</p>}
                    </div>
                  </div>

                  {/* Role — editable for full admins only */}
                  <div>
                    {isFullAdmin && editRoleId === user.id ? (
                      <select
                        defaultValue={user.role}
                        autoFocus
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        onBlur={() => setEditRoleId(null)}
                        style={{ ...selectStyle, fontSize: 12, padding: '4px 8px', width: 'auto' }}
                      >
                        {ROLES.filter((r) => r.value !== 'CLIENT').map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => isFullAdmin && user.id !== currentUser?.id && setEditRoleId(user.id)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: isFullAdmin && user.id !== currentUser?.id ? 'pointer' : 'default' }}
                        title={isFullAdmin && user.id !== currentUser?.id ? 'Click to change role' : undefined}
                      >
                        <RoleBadge role={user.role} />
                      </button>
                    )}
                  </div>

                  {/* Department */}
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{user.department || '—'}</span>

                  {/* Joined */}
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {isFullAdmin && user.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(user.id, user.name)} style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Role permissions reference */}
          <div className="panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14 }}>Role Permissions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ROLES.map((role) => (
                <div key={role.value} style={{
                  display: 'flex', gap: 12, padding: '12px 14px',
                  border: '1px solid rgba(0,0,0,0.08)', borderRadius: 10, alignItems: 'flex-start',
                }}>
                  <RoleBadge role={role.value} />
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{role.desc}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 4 }}>
                      {role.perms.map((p) => (
                        <span key={p} style={{ fontSize: 11, color: 'var(--muted-2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <CheckCircle size={9} color="#ADADAD" /> {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT ACCESS ─────────────────────────────────────────────────── */}
      {section === 'client-access' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Client Logins</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Clients are added from the Team tab — set their role to "Client" and link them to a brand. To add a client login, go to Team and click "+ Add Member".
            </p>
          </div>

          {/* What clients can do */}
          <div className="panel" style={{ padding: 20, borderLeft: '3px solid #111111' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 14 }}>What clients can do when they log in</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: Calendar, text: 'View their content calendar — all scheduled posts for their brand' },
                { icon: Eye, text: 'Browse all their posts with title, caption, media, platforms, and status' },
                { icon: UserCheck, text: 'Approve or request changes on posts sent for their sign-off' },
                { icon: Lock, text: 'Cannot see other clients, team members, or internal notes' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Icon size={14} color="#6B6B6B" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client user list */}
          {clientUsers.length === 0 ? (
            <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
              <Globe size={28} style={{ color: 'var(--muted-2)', marginBottom: 12 }} />
              <p style={{ fontWeight: 600, color: 'var(--text)', margin: '0 0 5px' }}>No client logins yet</p>
              <p style={{ color: 'var(--muted)', margin: 0, fontSize: 13 }}>Invite a client to give them portal access to review and approve their content.</p>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 180px 140px 80px',
                padding: '10px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#FAFAFA',
              }}>
                {['Client Contact', 'Brand', 'Since', ''].map((h) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {clientUsers.map((cu, i, arr) => (
                <div key={cu.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 180px 140px 80px',
                  padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  alignItems: 'center',
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{cu.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>{cu.email}</p>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{cu.client?.name ?? '—'}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {new Date(cu.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {isFullAdmin && (
                      <button onClick={() => handleDelete(cu.id, cu.name)} style={{ background: 'none', border: 'none', color: 'var(--muted-2)', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Client login info box */}
          <div className="panel" style={{ padding: 20, background: '#FAFAFA' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={16} color="#6B6B6B" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600 }}>Client login URL</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  Clients use the same login page as your team:{' '}
                  <code style={{ background: '#EBEBEB', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>
                    {window.location.origin}/login
                  </code>
                  {' '}— they will only see their brand's posts after logging in.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVAL HIERARCHY ─────────────────────────────────────────────── */}
      {section === 'hierarchy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Approval Pipeline</h3>

          {/* Visual pipeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const roleMeta = ROLES.find((r) => r.value === stage.role);
              return (
                <div key={stage.title} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                  {/* Connector line */}
                  <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    {i > 0 && <div style={{ width: 2, flex: '0 0 14px', background: 'rgba(0,0,0,0.1)' }} />}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: stage.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={14} color={stage.textColor} />
                    </div>
                    {i < PIPELINE_STAGES.length - 1 && <div style={{ width: 2, flex: 1, background: 'rgba(0,0,0,0.1)', minHeight: 14 }} />}
                  </div>

                  <div style={{ paddingLeft: 14, paddingBottom: i < PIPELINE_STAGES.length - 1 ? 18 : 0, paddingTop: i > 0 ? 14 : 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{stage.title}</p>
                      {stage.optional && (
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 980, background: '#F0F0F0', color: '#6B6B6B', border: '1px solid rgba(0,0,0,0.08)' }}>
                          optional
                        </span>
                      )}
                      {roleMeta && <RoleBadge role={stage.role} />}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{stage.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Role hierarchy pyramid */}
          <div className="panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Role Hierarchy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ROLES.map((role, i) => (
                <div key={role.value} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: i === 0 ? '#000' : i === 1 ? '#111' : i === 2 ? '#3A3A3A' : i === 3 ? '#EBEBEB' : '#F5F5F5',
                  border: '1px solid rgba(0,0,0,0.06)',
                  marginLeft: `${i * 16}px`,
                }}>
                  <Shield size={13} color={i < 3 ? '#fff' : '#6B6B6B'} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: i < 3 ? '#fff' : '#111111', flex: 1 }}>{role.label}</span>
                  <span style={{ fontSize: 12, color: i < 3 ? 'rgba(255,255,255,0.65)' : 'var(--muted)', maxWidth: 360, textAlign: 'right' }}>{role.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Who can do what */}
          <div className="panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>Who Can Do What</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Action</th>
                    {ROLES.map((r) => (
                      <th key={r.value} style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <RoleBadge role={r.value} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { action: 'Create & edit posts',    perms: [true, true, true, true, false] },
                    { action: 'Submit for review',      perms: [true, true, true, true, false] },
                    { action: 'Internal approval',      perms: [true, true, true, false, false] },
                    { action: 'Client approval',        perms: [true, true, false, false, true] },
                    { action: 'Schedule posts',         perms: [true, true, true, false, false] },
                    { action: 'Manage team',            perms: [true, true, false, false, false] },
                    { action: 'Invite clients',         perms: [true, true, false, false, false] },
                    { action: 'System settings',        perms: [true, false, false, false, false] },
                  ].map(({ action, perms }) => (
                    <tr key={action} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                      <td style={{ padding: '10px 10px', color: 'var(--text)', fontWeight: 400 }}>{action}</td>
                      {perms.map((has, pi) => (
                        <td key={pi} style={{ padding: '10px 10px', textAlign: 'center' }}>
                          {has
                            ? <CheckCircle size={14} color="#111111" />
                            : <span style={{ display: 'inline-block', width: 14, height: 2, background: '#EBEBEB', borderRadius: 1 }} />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── YOUR PROFILE ──────────────────────────────────────────────────── */}
      {section === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile card */}
          <div className="panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, paddingBottom: 22, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {(profile.name || currentUser?.name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>{profile.name || currentUser?.name}</p>
                <p style={{ margin: '2px 0', fontSize: 13, color: 'var(--muted)' }}>{currentUser?.email}</p>
                <RoleBadge role={currentUser?.role} />
              </div>
            </div>

            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                    <User size={11} style={{ marginRight: 4 }} />Full name
                  </label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                    <Phone size={11} style={{ marginRight: 4 }} />Phone
                  </label>
                  <input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                    <Briefcase size={11} style={{ marginRight: 4 }} />Job title
                  </label>
                  <input
                    value={profile.jobTitle}
                    onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })}
                    placeholder="Content Strategist"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                    <Building2 size={11} style={{ marginRight: 4 }} />Department
                  </label>
                  <input
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    placeholder="Design"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Bio</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="A short bio visible to your team..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="submit" className="primary-button" style={{ fontSize: 13 }} disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
                </button>
                {profileMsg && (
                  <span style={{ fontSize: 13, color: profileMsg.includes('Failed') ? 'var(--danger)' : '#3A3A3A' }}>
                    {profileMsg}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Change password */}
          <div className="panel" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Key size={14} /> Change Password
            </h3>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Current password</label>
                <input
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>New password</label>
                <input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  placeholder="Min. 6 characters"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>Confirm new password</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="submit" className="secondary-button" style={{ fontSize: 13 }} disabled={changePassword.isPending}>
                  {changePassword.isPending ? 'Updating...' : 'Update Password'}
                </button>
                {pwMsg && (
                  <span style={{ fontSize: 13, color: pwMsg.includes('success') ? '#3A3A3A' : 'var(--danger)' }}>
                    {pwMsg}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Account info */}
          <div className="panel" style={{ padding: 20, background: '#FAFAFA' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Account</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Email', value: currentUser?.email },
                { label: 'Role', value: getRoleMeta(currentUser?.role)?.label },
                { label: 'Member since', value: currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
