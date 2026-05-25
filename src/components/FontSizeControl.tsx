'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'blog-font-size-level';

/** rem values for each level — default (level 2) matches prose-lg (1.125rem) */
const FONT_REM = [0.875, 1, 1.125, 1.25, 1.5];
const DEFAULT_LEVEL = 2;
const LABELS: Record<number, string> = {
  0: '小',
  1: '默认',
  2: '中',
  3: '大',
  4: '超大',
};

interface FontSizeControlProps {
  children: ReactNode;
  /** Optional className for the outer wrapper */
  className?: string;
}

export function FontSizeControl({ children, className = '' }: FontSizeControlProps) {
  const [level, setLevel] = useState<number>(DEFAULT_LEVEL);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const n = Number(saved);
        if (n >= 0 && n < FONT_REM.length) {
          setLevel(n);
        }
      }
    } catch {
      // localStorage unavailable (SSR / incognito edge case)
    }
    setMounted(true);
  }, []);

  const changeSize = useCallback((delta: number) => {
    setLevel((prev) => {
      const next = Math.max(0, Math.min(FONT_REM.length - 1, prev + delta));
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setLevel(DEFAULT_LEVEL);
    try {
      localStorage.setItem(STORAGE_KEY, String(DEFAULT_LEVEL));
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className={className}>
      {/* Control bar — invisible until mounted to avoid hydration mismatch */}
      {mounted && (
        <div className="flex items-center gap-2 mb-6 print:hidden select-none">
          <span className="text-xs text-gray-400 mr-0.5">字号</span>
          <button
            onClick={() => changeSize(-1)}
            disabled={level === 0}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-sm leading-none"
            title="缩小字号"
            aria-label="缩小字号"
          >
            A⁻
          </button>
          <button
            onClick={reset}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors text-xs font-bold leading-none"
            title={`重置字号 (${LABELS[level]})`}
            aria-label="重置字号"
          >
            A
          </button>
          <button
            onClick={() => changeSize(1)}
            disabled={level >= FONT_REM.length - 1}
            className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-base leading-none"
            title="放大字号"
            aria-label="放大字号"
          >
            A⁺
          </button>
          {/* Visual indicator of current size */}
          <div className="ml-1 flex items-center gap-0.5">
            {FONT_REM.map((_, i) => (
              <span
                key={i}
                className={`block w-0.5 rounded-full transition-all duration-200 ${
                  i <= level
                    ? 'bg-primary-500'
                    : 'bg-gray-200'
                }`}
                style={{ height: `${4 + i * 3}px` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content wrapper with dynamic font-size overriding prose defaults */}
      <div style={{ fontSize: mounted ? `${FONT_REM[level]}rem` : undefined }}>
        {children}
      </div>
    </div>
  );
}
