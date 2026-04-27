'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import MD Editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface PostForm {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  tags: string;
  published: boolean;
}

const emptyForm: PostForm = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  tags: '',
  published: false,
};

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const slugParam = params?.slug;
  const postId = slugParam ? parseInt(slugParam[0]) : null;
  const isEditing = !!postId;

  const [form, setForm] = useState<PostForm>(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (postId) {
      fetchPost(postId);
    }
  }, [postId]);

  async function fetchPost(id: number) {
    try {
      const res = await fetch(`/api/posts/${id}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const post = await res.json();
      setForm({
        title: post.title || '',
        slug: post.slug || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        tags: post.tags ? JSON.parse(post.tags).join(', ') : '',
        published: post.published === 1,
      });
    } catch (err) {
      setError('加载文章失败');
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate slug from title
  const handleTitleChange = useCallback(
    (value: string) => {
      setForm((prev) => ({
        ...prev,
        title: value,
        slug: isEditing
          ? prev.slug
          : value
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim(),
      }));
    },
    [isEditing]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const tags = form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const body = {
        title: form.title,
        slug: form.slug,
        content: form.content,
        excerpt: form.excerpt,
        tags,
        published: form.published,
      };

      let res;
      if (isEditing) {
        res = await fetch(`/api/posts/${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? '编辑文章' : '写新文章'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标题
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 text-lg font-medium"
            placeholder="文章标题"
            required
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL 标识
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, slug: e.target.value }))
            }
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 font-mono text-sm"
            placeholder="post-url-slug"
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            将用于文章链接：/posts/{form.slug || 'your-slug'}
          </p>
        </div>

        {/* Content - Markdown Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            内容 (Markdown)
          </label>
          <div data-color-mode="light">
            <MDEditor
              value={form.content}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, content: value || '' }))
              }
              height={500}
              preview="live"
            />
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            摘要
          </label>
          <textarea
            value={form.excerpt}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, excerpt: e.target.value }))
            }
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            placeholder="文章摘要（可选）"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标签
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tags: e.target.value }))
            }
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
            placeholder="tech, javascript, web（用逗号分隔）"
          />
        </div>

        {/* Published toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  published: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
          <span className="text-sm text-gray-700">
            {form.published ? '发布' : '草稿'}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : isEditing ? '更新文章' : '发布文章'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/dashboard')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
