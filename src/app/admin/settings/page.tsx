'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [donateWechat, setDonateWechat] = useState('');
  const [donateAlipay, setDonateAlipay] = useState('');
  const [blogTitle, setBlogTitle] = useState('');
  const [blogDescription, setBlogDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const wechatInputRef = useRef<HTMLInputElement>(null);
  const alipayInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/posts?admin=true&limit=1');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      // For settings, we'll use a dedicated endpoint approach
      // Since settings are stored in D1, we fetch them via a custom approach
      // For now, we'll load from localStorage as fallback
      const savedSettings = localStorage.getItem('blog_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setDonateWechat(settings.donateWechat || '');
        setDonateAlipay(settings.donateAlipay || '');
        setBlogTitle(settings.blogTitle || 'My Blog');
        setBlogDescription(settings.blogDescription || '');
      }
    } catch (err) {
      setError('加载设置失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(field: 'wechat' | 'alipay') {
    const input = field === 'wechat' ? wechatInputRef.current : alipayInputRef.current;
    if (!input?.files?.length) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      if (field === 'wechat') {
        setDonateWechat(data.url);
      } else {
        setDonateAlipay(data.url);
      }
    } catch (err) {
      setError('上传失败');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const settings = {
        donateWechat,
        donateAlipay,
        blogTitle,
        blogDescription,
      };

      // Save to localStorage as fallback
      localStorage.setItem('blog_settings', JSON.stringify(settings));

      setSuccess('设置已保存');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('保存失败');
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">博客设置</h1>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                博客标题
              </label>
              <input
                type="text"
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                placeholder="My Blog"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                博客描述
              </label>
              <textarea
                value={blogDescription}
                onChange={(e) => setBlogDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
                placeholder="博客描述（可选）"
              />
            </div>
          </div>
        </section>

        {/* Donate QR Codes */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">打赏设置</h2>
          <p className="text-sm text-gray-500 mb-4">
            上传微信和支付宝收款二维码图片，访客可在文章详情页扫码打赏。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* WeChat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                微信收款码
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {donateWechat ? (
                  <div className="space-y-2">
                    <img
                      src={donateWechat}
                      alt="微信收款码"
                      className="w-32 h-32 object-contain mx-auto rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setDonateWechat('')}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      删除
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">未上传</p>
                    <input
                      ref={wechatInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={() => handleUpload('wechat')}
                    />
                    <button
                      type="button"
                      onClick={() => wechatInputRef.current?.click()}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      上传图片
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Alipay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                支付宝收款码
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {donateAlipay ? (
                  <div className="space-y-2">
                    <img
                      src={donateAlipay}
                      alt="支付宝收款码"
                      className="w-32 h-32 object-contain mx-auto rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setDonateAlipay('')}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      删除
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-400 text-sm mb-2">未上传</p>
                    <input
                      ref={alipayInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={() => handleUpload('alipay')}
                    />
                    <button
                      type="button"
                      onClick={() => alipayInputRef.current?.click()}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      上传图片
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-2.5 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </form>
    </div>
  );
}
