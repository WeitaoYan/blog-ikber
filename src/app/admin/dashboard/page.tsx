'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Post {
  id: number;
  title: string;
  slug: string;
  published: number;
  updated_at: string;
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch('/api/posts?admin=true&limit=50');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError('加载文章列表失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) return;

    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setPosts(posts.filter((p) => p.id !== id));
    } catch (err) {
      alert('删除失败');
    }
  }

  async function handleTogglePublish(id: number, current: number) {
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: current === 0 }),
      });
      if (!res.ok) throw new Error('Update failed');
      setPosts(
        posts.map((p) =>
          p.id === id ? { ...p, published: current === 0 ? 1 : 0 } : p
        )
      );
    } catch (err) {
      alert('更新失败');
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary-600"></div>
        <p className="mt-2 text-gray-500">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchPosts}
          className="mt-4 text-primary-600 hover:underline"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">文章管理</h1>
        <Link
          href="/admin/editor"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          写新文章
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">还没有文章</p>
          <Link
            href="/admin/editor"
            className="mt-2 inline-block text-primary-600 hover:underline"
          >
            开始写第一篇文章
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  标题
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  状态
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                  更新时间
                </th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/editor/${post.id}`}
                      className="text-gray-900 font-medium hover:text-primary-600 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {post.published ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(post.updated_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() =>
                          handleTogglePublish(post.id, post.published)
                        }
                        className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                      >
                        {post.published ? '下架' : '发布'}
                      </button>
                      <Link
                        href={`/admin/editor/${post.id}`}
                        className="text-sm text-gray-600 hover:text-primary-600 transition-colors"
                      >
                        编辑
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="text-sm text-red-500 hover:text-red-700 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
