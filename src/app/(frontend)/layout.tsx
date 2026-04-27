import Link from 'next/link';

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-primary-600 transition-colors">
            My Blog
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              首页
            </Link>
            <Link
              href="/search"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              搜索
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} My Blog. All rights reserved.</p>
          <p className="mt-1">
            Powered by{' '}
            <a
              href="https://nextjs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Next.js
            </a>
            {' '}&{' '}
            <a
              href="https://pages.cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline"
            >
              Cloudflare Pages
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
