import { useState, useEffect } from 'react';
import { getDarkMode, setDarkMode as saveDarkMode } from '../store';

export function useDarkMode() {
  const [dark, setDark] = useState(getDarkMode());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    saveDarkMode(dark);

    // meta theme-color আপডেট
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', dark ? '#0F172A' : '#2563EB');
    }
  }, [dark]);

  const toggle = () => setDark(!dark);

  return { dark, toggle, setDark };
}
