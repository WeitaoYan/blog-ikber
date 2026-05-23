'use client';

import { useEffect, useRef } from 'react';

interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

export default function Giscus() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function initGiscus() {
      try {
        const res = await fetch('/api/giscus-config');
        const config: GiscusConfig = await res.json();

        if (!config.repo || !config.repoId || !config.category || !config.categoryId) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Giscus is not configured. Please set NEXT_PUBLIC_GISCUS_* environment variables in wrangler.toml.');
          }
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://giscus.app/client.js';
        script.setAttribute('data-repo', config.repo);
        script.setAttribute('data-repo-id', config.repoId);
        script.setAttribute('data-category', config.category);
        script.setAttribute('data-category-id', config.categoryId);
        script.setAttribute('data-mapping', 'pathname');
        script.setAttribute('data-strict', '0');
        script.setAttribute('data-reactions-enabled', '1');
        script.setAttribute('data-emit-metadata', '0');
        script.setAttribute('data-input-position', 'bottom');
        script.setAttribute('data-theme', 'light');
        script.setAttribute('data-lang', 'zh-CN');
        script.setAttribute('crossorigin', 'anonymous');
        script.async = true;

        const container = containerRef.current;
        if (container) {
          container.innerHTML = '';
          container.appendChild(script);
        }
      } catch {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to fetch Giscus config');
        }
      }
    }

    initGiscus();

    return () => {
      const container = containerRef.current;
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="mt-8"
    />
  );
}
