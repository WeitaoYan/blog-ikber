import Link from 'next/link';

// This is a static page that will be rendered at build time
// In production with Cloudflare Pages + D1, this would use SSR/ISR
// For now, we'll create a static version that shows the blog structure

interface PostListItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  tags: string | null;
  updated_at: string;
}

// Since we're using static export, we'll fetch data client-side
// This page serves as the shell
export default function HomePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">文章列表</h1>
        <p className="text-gray-600">欢迎来到我的博客</p>
      </div>

      {/* Post list will be loaded client-side */}
      <div id="post-list">
        <PostListClient />
      </div>
    </div>
  );
}

// Client component for fetching and rendering posts
function PostListClient() {
  return (
    <div>
      {/* Posts are loaded via client-side fetch */}
      <PostListSkeleton />
    </div>
  );
}

function PostListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );
}
