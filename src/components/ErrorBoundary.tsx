import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A8A)' }}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl">
            <div className="text-5xl mb-4">😟</div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">কিছু ভুল হয়েছে</h1>
            <p className="text-sm text-gray-500 mb-2 leading-relaxed">
              অ্যাপে একটি সমস্যা হয়েছে। আপনার ডেটা নিরাপদ আছে।
            </p>
            <p className="text-xs text-red-400 bg-red-50 p-2 rounded-lg mb-6 font-mono break-all">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)' }}
              >
                🔄 রিফ্রেশ করুন
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex-1 py-3 rounded-2xl font-semibold text-sm bg-gray-100 text-gray-700 border border-gray-200"
              >
                আবার চেষ্টা
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
