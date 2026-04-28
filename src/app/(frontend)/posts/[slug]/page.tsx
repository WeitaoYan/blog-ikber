import { MDXRenderer } from '@/components/MDXRenderer';
import { LikeButton } from '@/components/LikeButton';
import { DonateBox } from '@/components/DonateBox';
import Giscus from '@/components/Giscus';

// This is a static page shell - content will be loaded client-side
// In production with Cloudflare Pages Functions, this would use SSR

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Required for static export with dynamic routes
export function generateStaticParams() {
  // In production, this would fetch all post slugs from D1
  // For now, return empty to allow on-demand generation
  return [];
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  return (
    <article>
      {/* Post content will be loaded client-side */}
      <PostContent slug={slug} />
    </article>
  );
}

function PostContent({ slug }: { slug: string }) {
  return (
    <div>
      {/* Post header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {/* Title loaded client-side */}
          <PostTitle slug={slug} />
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <PostMeta slug={slug} />
        </div>
      </header>

      {/* Markdown content */}
      <div className="prose prose-lg max-w-none mb-12">
        <PostBody slug={slug} />
      </div>

      {/* Tags */}
      <PostTags slug={slug} />

      {/* Like button */}
      <div className="mb-8">
        <LikeButton slug={slug} />
      </div>

      {/* Donate box */}
      <DonateBox />

      {/* Comments */}
      <div className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">评论</h2>
        <Giscus />
      </div>
    </div>
  );
}

// Placeholder components that will be hydrated client-side
function PostTitle({ slug }: { slug: string }) {
  return <span id={`post-title-${slug}`}>Loading...</span>;
}

function PostMeta({ slug }: { slug: string }) {
  return (
    <>
      <span id={`post-date-${slug}`}>Loading...</span>
      <span id={`post-reading-time-${slug}`}></span>
    </>
  );
}

function PostBody({ slug }: { slug: string }) {
  return <div id={`post-content-${slug}`}>Loading...</div>;
}

function PostTags({ slug }: { slug: string }) {
  return <div id={`post-tags-${slug}`} className="mb-8"></div>;
}
