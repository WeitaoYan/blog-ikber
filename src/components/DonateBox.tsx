'use client';

import { useState, useEffect } from 'react';

interface DonateSettings {
  wechat?: string;
  alipay?: string;
}

export function DonateBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<DonateSettings>({});

  useEffect(() => {
    // Load donate settings from localStorage (set by admin settings page)
    try {
      const saved = localStorage.getItem('blog_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({
          wechat: parsed.donateWechat,
          alipay: parsed.donateAlipay,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const hasDonate = settings.wechat || settings.alipay;
  if (!hasDonate) return null;

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full text-sm font-medium hover:bg-yellow-100 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {isOpen ? '收起打赏' : '打赏支持'}
      </button>

      {isOpen && (
        <div className="mt-4 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-600 mb-4 text-center">
            如果这篇文章对你有帮助，欢迎打赏支持
          </p>
          <div className="flex justify-center gap-8">
            {settings.wechat && (
              <div className="text-center">
                <img
                  src={settings.wechat}
                  alt="微信打赏"
                  className="w-36 h-36 object-contain rounded-lg bg-white p-2 shadow-sm"
                />
                <p className="mt-2 text-xs text-gray-500">微信</p>
              </div>
            )}
            {settings.alipay && (
              <div className="text-center">
                <img
                  src={settings.alipay}
                  alt="支付宝打赏"
                  className="w-36 h-36 object-contain rounded-lg bg-white p-2 shadow-sm"
                />
                <p className="mt-2 text-xs text-gray-500">支付宝</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
