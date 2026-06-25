import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const { fallback } = this.props;
    if (fallback) return fallback;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, gap: 12, textAlign: 'center',
      }}>
        <AlertTriangle size={22} color="#6B6B6B" />
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111111' }}>
          Something went wrong
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#6B6B6B', maxWidth: 280 }}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          style={{
            background: '#111111', color: '#fff', border: 'none', borderRadius: 980,
            padding: '7px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
