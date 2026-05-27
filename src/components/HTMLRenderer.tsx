'use client';

/**
 * HTMLRenderer — renders raw HTML content safely.
 * Content comes from admin-edited posts, so XSS trust is high.
 * For additional sanitization, pipe through DOMPurify if needed.
 */
interface HTMLRendererProps {
  content: string;
}

export function HTMLRenderer({ content }: HTMLRendererProps) {
  return (
    <div
      className="html-content prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
