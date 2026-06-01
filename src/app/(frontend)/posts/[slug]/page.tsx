import { MDXRenderer } from '@/components/MDXRenderer';
import { HTMLRenderer } from '@/components/HTMLRenderer';
import { LikeButton } from '@/components/LikeButton';
import { DonateBox } from '@/components/DonateBox';
import { FontSizeControl } from '@/components/FontSizeControl';
import { PageViewCounter } from '@/components/PageViewCounter';
import Giscus from '@/components/Giscus';
import { getPostBySlug } from '@/lib/db';
import { notFound } from 'next/navigation';

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return { title: '文章未找到' };
  }
  return { title: post.title };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.replace(/[#*`\[\]()]/g, '').length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} 分钟阅读`;
}

function parseTags(tagsJson: string | null): string[] {
  if (!tagsJson) return [];
  try {
    return JSON.parse(tagsJson);
  } catch {
    return [];
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const tags = parseTags(post.tags);
  const formattedDate = formatDate(post.updated_at);
  const readingTime = calculateReadingTime(post.content);

  return (
    <article>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {post.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <time dateTime={post.updated_at}>{formattedDate}</time>
          <span>{readingTime}</span>
          <PageViewCounter slug={slug} initialViews={post.views ?? 0} />
        </div>
      </header>

      <FontSizeControl className="mb-12">
        {post.format === 'html' ? (
          <HTMLRenderer content={post.content} />
        ) : (
          <div className="prose prose-lg max-w-none">
            <MDXRenderer content={post.content} />
          </div>
        )}
      </FontSizeControl>

      {tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mb-8">
        <LikeButton slug={slug} />
      </div>

      <DonateBox />

      <div className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">评论</h2>
        <Giscus />
      </div>
    </article>
  );
}
