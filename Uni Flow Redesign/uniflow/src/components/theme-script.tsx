import type { Theme } from '@/lib/console/theme';

/**
 * Applying the theme before anything is visible.
 *
 * The explicit choices — light and dark — need no script at all: the server
 * already put the class on <html>, so the first byte of markup is correct.
 *
 * `system` is the case that cannot be answered on the server. The operating
 * system's preference is not in the request (`prefers-color-scheme` reaches CSS,
 * not the renderer), so the class is resolved here, in a synchronous inline
 * script in <head> — before the body parses and therefore before the first
 * paint. A `useEffect` would run after it, which is the white flash this exists
 * to prevent.
 *
 * The listener keeps a `system` user in step if they flip their machine to dark
 * while the page is open, which is what "system" means.
 *
 * Not user input: `theme` is one of three literals, checked by `isTheme` before
 * it ever gets here.
 */
export function ThemeScript({ theme }: { theme: Theme }) {
  const js = `(function(){try{var r=document.documentElement;
var m=window.matchMedia('(prefers-color-scheme: dark)');
function a(){var t=r.getAttribute('data-theme');
r.classList.toggle('dark',t==='dark'||(t!=='light'&&m.matches));}
a();if(m.addEventListener)m.addEventListener('change',a);
new MutationObserver(a).observe(r,{attributes:true,attributeFilter:['data-theme']});
}catch(e){}})();`;

  return (
    <>
      <meta
        name="color-scheme"
        content={theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'light dark'}
      />
      <script dangerouslySetInnerHTML={{ __html: js }} />
    </>
  );
}
