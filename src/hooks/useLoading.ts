import { useState, useEffect } from 'react';

// Simulates initial loading state for smooth skeleton → content transition
export function usePageLoad(delayMs = 150): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return loading;
}
