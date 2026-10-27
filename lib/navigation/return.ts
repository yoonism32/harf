export function safeReturn(value: string | null | undefined): string | null {
 if (!value || value.length > 6000 || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return null;
 try {
  const url = new URL(value, 'https://harf.local');
  if (url.origin !== 'https://harf.local' || !/^\/(today|learn|read|practice|insights|study|progress|collections)(\/|$)/.test(url.pathname)) return null;
  return url.pathname + url.search + url.hash;
 } catch { return null; }
}

export function returnLabel(href: string) {
 if (href.startsWith('/practice')) return 'Continue practice';
 if (/\/read\/\d+\/\d+\/study/.test(href)) return 'Continue passage study';
 if (href.startsWith('/study')) return 'Continue study session';
 if (href.startsWith('/read')) return 'Return to reading';
 if (href.startsWith('/learn')) return 'Return to vocabulary';
 if (href.startsWith('/insights/practice')) return 'Continue passage comparison';
 return 'Return to where you left off';
}
