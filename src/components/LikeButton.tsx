'use client';

import { useState, useEffect, useCallback } from 'react';

interface LikeButtonProps {
  slug: string;
}

export function LikeButton({ slug }: LikeButtonProps) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch initial like count
    fetch(`/api/posts/${slug}/like`)
      .then((res) => res.json())
      .then((data) => {
        if (data.count !== undefined) {
          setCount(data.count);
        }
      })
      .catch(console.error);

    // Check if already liked from cookie
    const cookies = document.cookie.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'liked_posts' && value) {
        try {
          const likedPosts = JSON.parse(decodeURIComponent(value));
          if (likedPosts.includes(slug)) {
            setLiked(true);
          }
        } catch {
          // ignore parse errors
        }
        break;
      }
    }
  }, [slug]);

  const handleLike = useCallback(async () => {
    if (liked || loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/posts/${slug}/like`, {
        method: 'POST',
      });

      if (res.status === 409) {
        // Already liked
        setLiked(true);
        const data = await res.json();
        if (data.count !== undefined) setCount(data.count);
      } else if (res.ok) {
        const data = await res.json();
        if (data.count !== undefined) setCount(data.count);
        setLiked(true);
      }
    } catch (error) {
      console.error('Failed to like post:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, liked, loading]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleLike}
        disabled={liked || loading}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          liked
            ? 'bg-red-50 text-red-600 border border-red-200'
            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
        } disabled:cursor-not-allowed`}
      >
        <svg
          className={`w-5 h-5 ${liked ? 'fill-current' : ''}`}
          viewBox="0 0 24 24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <span>{liked ? '已点赞' : '点赞'}</span>
        {count > 0 && (
          <span className="text-xs text-gray-400">({count})</span>
        )}
      </button>
    </div>
  );
}
