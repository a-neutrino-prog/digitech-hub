import { useState, useEffect } from 'react';
import { getDarkMode, setDarkMode as saveDarkMode } from '../store';

export function useDarkMode() {
  const [dark, setDark] = useState(getDarkMode());

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveDarkMode(dark);
  }, [dark]);

  const toggle = () => setDark(!dark);

  return { dark, toggle, setDark };
}
