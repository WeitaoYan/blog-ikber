'use client';

import { useState, useEffect } from 'react';

interface PageViewCounterProps {
  slug: string;
  initialViews: number;
}

export function PageViewCounter({ slug, initialViews }: PageViewCounterProps) {
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    const recordView = async () => {
      try {
        const res = await fetch(`/api/posts/${slug}/views`, {
          method: 'POST',
        });
        const data = await res.json();
        if (data.count !== undefined) {
          setViews(data.count);
        }
      } catch {
        // Silently fail — view counting is non-critical
      }
    };
    recordView();
  }, [slug]);

  return (
    <span className="inline-flex items-center gap-1" title="阅读次数">
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {views}
    </span>
  );
}
