'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string | null;
  updated_at: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) search(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">搜索文章</h1>

      {/* Search input */}
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入关键词搜索..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 placeholder-gray-400"
          autoFocus
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary-600"></div>
          <p className="mt-2 text-gray-500">搜索中...</p>
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <div>
          {results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">未找到相关文章</p>
              <p className="text-gray-400 mt-2">请尝试其他关键词</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                找到 {results.length} 篇相关文章
              </p>
              <div className="space-y-6">
                {results.map((post) => (
                  <article
                    key={post.id}
                    className="border-b border-gray-100 pb-6"
                  >
                    <Link
                      href={`/posts/${post.slug}`}
                      className="block group"
                    >
                      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-gray-600 mb-2 line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <time>
                          {new Date(post.updated_at).toLocaleDateString('zh-CN')}
                        </time>
                        {post.tags && (
                          <div className="flex gap-2">
                            {JSON.parse(post.tags).map((tag: string) => (
                              <span
                                key={tag}
                                className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <div className="text-center py-12 text-gray-400">
          <p>输入关键词开始搜索</p>
        </div>
      )}
    </div>
  );
}
