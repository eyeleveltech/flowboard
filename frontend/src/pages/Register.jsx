import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(true); // Default to true while checking
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/setup-status')
      .then(res => setIsSetup(res.data.isSetup))
      .catch(console.error);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { name, email, password });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F5F5F5',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Brand mark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: '#111111',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px', marginBottom: 14,
          }}>
            FB
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 3, letterSpacing: '-0.5px' }}>
            FlowBoard
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', letterSpacing: '-0.1px' }}>
            by EyeLevel Growth Studio
          </p>
          <p style={{ color: '#ADADAD', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
            Set up the initial Admin account for your workspace.
          </p>
        </div>

        {isSetup ? (
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            padding: '32px 28px',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.2px' }}>Registration Closed</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
              The initial setup has already been completed. Please contact your administrator to create an account for you.
            </p>
          </div>
        ) : (
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            padding: '32px 28px',
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Label style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '-0.15px' }}>Full Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  style={{ borderRadius: 10, fontSize: 15 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Label style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '-0.15px' }}>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@eyelevelstudio.in"
                  required
                  style={{ borderRadius: 10, fontSize: 15 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Label style={{ fontSize: 13, color: 'var(--text)', letterSpacing: '-0.15px' }}>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{ borderRadius: 10, fontSize: 15 }}
                />
              </div>

              {error && (
                <p style={{
                  color: 'var(--text)',
                  fontSize: 13,
                  margin: 0,
                  padding: '9px 12px',
                  background: '#F0F0F0',
                  borderRadius: 8,
                  letterSpacing: '-0.15px',
                }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="primary-button"
                style={{ width: '100%', justifyContent: 'center', marginTop: 6, fontSize: 15, padding: '11px 21px' }}
              >
                {loading ? 'Setting up...' : 'Create Admin Account'}
              </button>
            </form>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ color: 'var(--muted-2)', fontSize: 13, letterSpacing: '-0.1px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--text)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
