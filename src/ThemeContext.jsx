import React, { createContext, useState, useEffect } from 'react';
export const ThemeContext = createContext();
export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    document.body.style.backgroundColor = darkMode ? '#121212' : '#ffffff';
    document.body.style.color = darkMode ? '#ffffff' : '#000000';
  }, [darkMode]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => { if (!localStorage.getItem('theme')) setDarkMode(e.matches); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const setTheme = (mode) => {
    if (mode === 'auto') {
      localStorage.removeItem('theme');
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      localStorage.setItem('theme', mode);
      setDarkMode(mode === 'dark');
    }
  };
  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
