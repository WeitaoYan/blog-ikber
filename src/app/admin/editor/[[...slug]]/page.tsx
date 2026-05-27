'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { UploadMDEditor } from '@/components/UploadMDEditor';
import { UploadHTMLEditor } from '@/components/UploadHTMLEditor';

interface PostForm {
  title: string;
  slug: string;
  content: string;
  format: 'markdown' | 'html';
  excerpt: string;
  tags: string;
  published: boolean;
}

const emptyForm: PostForm = {
  title: '',
  slug: '',
  content: '',
  format: 'markdown',
  excerpt: '',
  tags: '',
  published: false,
};

const AUTOSAVE_KEY = 'draft_post';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

export default function EditorPage() {
  const router = useRouter();
  const params = useParams();
  const slugParam = params?.slug;
  const rawId = slugParam ? parseInt(slugParam[0]) : null;
  const postId = rawId && !isNaN(rawId) ? rawId : null;
  const isEditing = !!postId;

  const [form, setForm] = useState<PostForm>(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedFormRef = useRef<string>('');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft from localStorage on mount (only for new posts)
  useEffect(() => {
    if (!isEditing) {
      const savedDraft = localStorage.getItem(AUTOSAVE_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setForm(draft);
          setLastSaved(new Date(draft.savedAt));
          lastSavedFormRef.current = JSON.stringify(draft);
        } catch {
          localStorage.removeItem(AUTOSAVE_KEY);
        }
      }
    }
  }, [isEditing]);

  // Define fetchPost function before it's used in useEffect
  const fetchPost = useCallback(function(id: number) {
    fetch(`/api/posts/${id}`)
      .then((res) => {
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((post) => {
        if (post) {
          setForm({
            title: post.title || '',
            slug: post.slug || '',
            content: post.content || '',
            format: post.format === 'html' ? 'html' : 'markdown',
            excerpt: post.excerpt || '',
            tags: post.tags ? JSON.parse(post.tags).join(', ') : '',
            published: post.published === 1,
          });
          lastSavedFormRef.current = JSON.stringify({
            title: post.title || '',
            slug: post.slug || '',
            content: post.content || '',
            format: post.format === 'html' ? 'html' : 'markdown',
            excerpt: post.excerpt || '',
            tags: post.tags ? JSON.parse(post.tags).join(', ') : '',
            published: post.published === 1,
          });
        }
      })
      .catch(() => {
        setError('加载文章失败');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router, setForm, setError, setLoading]);

  // Fetch existing post when editing
  useEffect(() => {
    if (postId) {
      fetchPost(postId);
    }
  }, [postId, fetchPost]);

  // Track unsaved changes
  useEffect(() => {
    const currentForm = JSON.stringify(form);
    if (currentForm !== lastSavedFormRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [form]);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (isEditing) return;

    const draftWithTimestamp = {
      ...form,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draftWithTimestamp));
    lastSavedFormRef.current = JSON.stringify(draftWithTimestamp);
    setLastSaved(new Date());
    setAutoSaving(false);
    setHasUnsavedChanges(false);
  }, [form, isEditing]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!isEditing && hasUnsavedChanges && form.title) {
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, AUTOSAVE_INTERVAL);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [form, hasUnsavedChanges, isEditing, saveDraft]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isEditing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isEditing]);

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

  // Handle form field changes
  const handleFormChange = useCallback(
    (field: keyof PostForm, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
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
        format: form.format,
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

      // Clear draft on successful save
      if (!isEditing) {
        localStorage.removeItem(AUTOSAVE_KEY);
      }

      router.push('/admin/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  function formatLastSaved(date: Date): string {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? '编辑文章' : '写新文章'}
        </h1>
        {!isEditing && (
          <div className="flex items-center gap-3 text-sm">
            {autoSaving && (
              <span className="text-gray-500">保存中...</span>
            )}
            {!autoSaving && lastSaved && (
              <span className="text-gray-500">
                已保存 {formatLastSaved(lastSaved)}
              </span>
            )}
            {hasUnsavedChanges && !lastSaved && (
              <span className="text-amber-600">未保存</span>
            )}
            <button
              type="button"
              onClick={saveDraft}
              disabled={autoSaving || !hasUnsavedChanges}
              className="text-primary-600 hover:text-primary-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              保存草稿
            </button>
          </div>
        )}
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
            onChange={(e) => handleFormChange('slug', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 font-mono text-sm"
            placeholder="post-url-slug"
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            将用于文章链接：/posts/{form.slug || 'your-slug'}
          </p>
        </div>

        {/* Format Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            内容格式
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleFormChange('format', 'markdown')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                form.format === 'markdown'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Markdown
            </button>
            <button
              type="button"
              onClick={() => handleFormChange('format', 'html')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                form.format === 'html'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              HTML
            </button>
          </div>
        </div>

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            内容
            {form.format === 'html' ? ' (HTML)' : ' (Markdown)'}
          </label>
          {form.format === 'html' ? (
            <div data-color-mode="light">
              <UploadHTMLEditor
                value={form.content}
                onChange={(value) => handleFormChange('content', value)}
                height={500}
              />
            </div>
          ) : (
          <div data-color-mode="light">
            <UploadMDEditor
              value={form.content}
              onChange={(value) => handleFormChange('content', value)}
              height={500}
            />
          </div>
          )}
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            摘要
          </label>
          <textarea
            value={form.excerpt}
            onChange={(e) => handleFormChange('excerpt', e.target.value)}
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
            onChange={(e) => handleFormChange('tags', e.target.value)}
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
              onChange={(e) => handleFormChange('published', e.target.checked)}
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
