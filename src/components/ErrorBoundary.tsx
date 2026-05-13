import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; errorInfo: string; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Silent error logging
    const errorLog = {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      component: info.componentStack?.slice(0, 300),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent.slice(0, 100),
    };

    // Save to localStorage for debugging
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.unshift(errorLog);
      if (logs.length > 10) logs.splice(10);
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch { /* ignore */ }

    this.setState({ errorInfo: info.componentStack || '' });
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      const errorCode = `ERR-${Date.now().toString(36).slice(-6).toUpperCase()}`;

      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A8A)' }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl">
            <div className="text-5xl mb-4">😟</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">কিছু ভুল হয়েছে</h1>
            <p className="text-sm text-gray-500 mb-3 leading-relaxed">
              অ্যাপে একটি সমস্যা হয়েছে। আপনার ডেটা নিরাপদ আছে।
            </p>

            {/* Error Code */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Error Code</p>
              <p className="text-xs font-mono text-gray-600 font-semibold">{errorCode}</p>
            </div>

            {/* Error Details (collapsible) */}
            <details className="text-left mb-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">বিস্তারিত দেখুন</summary>
              <div className="mt-2 p-3 bg-red-50 rounded-xl">
                <p className="text-xs text-red-600 font-mono break-all">{this.state.error?.message || 'Unknown error'}</p>
              </div>
            </details>

            <div className="flex gap-3">
              <button onClick={() => window.location.reload()}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}>
                🔄 রিফ্রেশ
              </button>
              <button onClick={() => this.setState({ hasError: false, error: null, errorInfo: '' })}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200 active:scale-[0.97] transition-all">
                আবার চেষ্টা
              </button>
            </div>

            {/* Go home */}
            <button onClick={() => { this.setState({ hasError: false }); window.location.hash = ''; window.location.reload(); }}
              className="w-full text-center text-xs text-gray-400 mt-4 hover:text-gray-600">
              হোম পেজে যান →
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
