'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import Image from 'next/image';

interface MDXRendererProps {
  content: string;
}

// 自定义白名单配置，允许安全的HTML标签
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'details',
    'summary',
  ],
};

export function MDXRenderer({ content }: MDXRendererProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
        components={{
          // Customize code blocks
          pre: ({ children, ...props }) => (
            <pre className="bg-gray-900 text-gray-100 rounded-lg overflow-x-auto p-4 text-sm leading-relaxed" {...props}>
              {children}
            </pre>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Open external links in new tab
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http');
            return (
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="text-primary-600 hover:text-primary-800 underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            // 移除width和height属性，因为Image组件会自动处理
            const { width, height, ...restProps } = props;
            return (
              <Image
                src={src || ''}
                alt={alt || 'Image'}
                width={0}
                height={0}
                sizes="100vw"
                className="rounded-lg mx-auto max-w-full h-auto"
                loading="lazy"
                {...restProps}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}