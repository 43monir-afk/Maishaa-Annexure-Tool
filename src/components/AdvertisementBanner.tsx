import React, { useEffect, useRef, useState } from 'react';

export const AdvertisementBanner: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy loading observer for performance
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Safe isolated loading for additional ad script
  useEffect(() => {
    if (!isVisible) return;
    try {
      const script = document.createElement('script');
      script.src =
        'https://pl31374361.profitableratecpmnetwork.com/42/df/2e/42df2e60dd09ea24254b26d516dbce32.js';
      script.async = true;
      script.type = 'text/javascript';
      script.onerror = () => {
        // Quietly fail safe if ad network is unreachable or blocked
      };
      document.body.appendChild(script);

      return () => {
        try {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        } catch {
          // Ignore removal errors
        }
      };
    } catch {
      // Non-breaking fallback
    }
  }, [isVisible]);

  // HTML content for isolated 320x50 iframe banner
  const iframeSrcDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base target="_blank" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 320px;
      height: 50px;
      overflow: hidden;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div id="ad-slot" style="width: 320px; height: 50px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
    <script type="text/javascript">
      try {
        var atOptions = {
          'key' : '4f071817d69b6c2fb932e2c5f2e78b97',
          'format' : 'iframe',
          'height' : 50,
          'width' : 320,
          'params' : {}
        };
      } catch (e) {
        // Safe catch
      }
    </script>
    <script type="text/javascript" src="https://www.highrevenueformat.com/4f071817d69b6c2fb932e2c5f2e78b97/invoke.js"></script>
  </div>
</body>
</html>`;

  return (
    <section
      ref={containerRef}
      id="advertisement-section"
      aria-label="Sponsored Advertisement"
      className="bg-white border border-slate-200 p-3 my-4 flex flex-col items-center justify-center transition-colors"
    >
      <div className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5 px-1 max-w-[320px]">
        <span>SPONSORED</span>
        <span>320×50 BANNER</span>
      </div>

      {/* Fixed reserved space to eliminate layout shift */}
      <div
        className="w-[320px] h-[50px] min-w-[320px] min-h-[50px] overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center relative shadow-xs"
        style={{ width: '320px', height: '50px' }}
      >
        {isVisible ? (
          <iframe
            title="Sponsored Advertisement Banner"
            srcDoc={iframeSrcDoc}
            width={320}
            height={50}
            className="w-[320px] h-[50px] border-0 overflow-hidden"
            scrolling="no"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="text-[10px] text-slate-300 font-mono">
            Advertisement Loading...
          </div>
        )}
      </div>
    </section>
  );
};
