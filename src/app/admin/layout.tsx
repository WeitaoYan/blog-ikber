import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin/dashboard" className="text-xl font-bold text-gray-900">
            管理后台
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              文章管理
            </Link>
            <Link
              href="/admin/editor"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              写文章
            </Link>
            <Link
              href="/admin/settings"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              设置
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              target="_blank"
            >
              查看博客
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
