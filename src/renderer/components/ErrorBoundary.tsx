import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('CoreMind ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100vw',
            height: '100vh',
            backgroundColor: '#1E1F20',
            color: '#E8EAED',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '24px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#282A2C',
              borderRadius: '8px',
              border: '1px solid #3C4043',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={24} color="#F28B82" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#F28B82' }}>
                Application Encountered an Error
              </h2>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#9AA0A6', lineHeight: 1.5 }}>
              CoreMind caught an unexpected error. You can attempt to restore the session or reload the application.
            </p>

            {this.state.error && (
              <div
                style={{
                  backgroundColor: '#1E1F20',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #3C4043',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: '#F28B82',
                  wordBreak: 'break-word',
                  maxHeight: '140px',
                  overflowY: 'auto',
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '6px 14px',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  border: '1px solid #5F6368',
                  color: '#E8EAED',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  backgroundColor: '#8AB4F8',
                  border: 'none',
                  color: '#1E1F20',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={13} />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
