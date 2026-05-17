'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface PostListItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string | null;
  updated_at: string;
}

interface PostsResponse {
  posts: PostListItem[];
  total: number;
}

const PER_PAGE = 10;

export function HomePage() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/posts?page=${page}&limit=${PER_PAGE}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `请求失败 (${res.status})`);
      }
      const data: PostsResponse = await res.json();
      setPosts(data.posts || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载文章列表失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const goToPage = useCallback((p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [totalPages]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">文章列表</h1>
        <p className="text-gray-600">欢迎来到我的博客</p>
      </div>

      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse border-b border-gray-100 pb-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-12">
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button
            onClick={() => { setPage(1); fetchPosts(); }}
            className="text-primary-600 hover:underline"
          >
            重试
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">暂无文章</p>
              <p className="text-gray-400 mt-2">请稍后再来</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <article key={post.id} className="border-b border-gray-100 pb-6">
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
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-10 pt-6 border-t border-gray-100">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← 上一页
              </button>

              <div className="flex gap-1.5">
                {Array.from({ length: Math.min(totalPages, 99) }, (_, i) => i + 1)
                  .filter((p) => {
                    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) return true;
                    if (p === page - 2 || p === page + 2) return true;
                    return false;
                  })
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <span key={p} className="flex items-center">
                        {showEllipsis && (
                          <span className="px-1 text-gray-400">...</span>
                        )}
                        <button
                          onClick={() => goToPage(p)}
                          className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                            p === page
                              ? 'bg-primary-600 text-white shadow-sm'
                              : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
              </div>

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一页 →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
