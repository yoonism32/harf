export type Theme = 'paper' | 'night';
const key = 'harf:theme';
export function getTheme(): Theme { try { return localStorage.getItem(key) === 'night' ? 'night' : 'paper'; } catch { return 'paper'; } }
export function setTheme(theme: Theme) { document.documentElement.dataset.theme = theme; try { localStorage.setItem(key, theme); } catch { /* Presentation still works for this visit. */ } }
