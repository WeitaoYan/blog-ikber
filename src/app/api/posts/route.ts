import { NextRequest, NextResponse } from "next/server";
import { getPosts, createPost, getAllPostsAdmin } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { POSTS_PER_PAGE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || String(POSTS_PER_PAGE));
  const tag = searchParams.get("tag") || undefined;
  const admin = searchParams.get("admin") === "true";

  try {
    if (admin) {
      const authenticated = await requireAuth(request);
      if (!authenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const result = await getAllPostsAdmin(page, limit);
      return NextResponse.json(result);
    }

    const result = await getPosts(page, limit, tag);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: "Failed to fetch posts", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const authenticated = await requireAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, content, excerpt, tags, published } = body;

    // 验证必填字段
    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required" },
        { status: 400 },
      );
    }

    // 验证字段长度限制
    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be less than 200 characters" },
        { status: 400 },
      );
    }
    if (slug.length > 200) {
      return NextResponse.json(
        { error: "Slug must be less than 200 characters" },
        { status: 400 },
      );
    }
    if (content.length > 100000) {
      return NextResponse.json(
        { error: "Content must be less than 100,000 characters" },
        { status: 400 },
      );
    }
    if (excerpt && excerpt.length > 500) {
      return NextResponse.json(
        { error: "Excerpt must be less than 500 characters" },
        { status: 400 },
      );
    }

    const post = await createPost({
      title,
      slug,
      content,
      excerpt,
      tags: tags ? JSON.stringify(tags) : undefined,
      published: published ? 1 : 0,
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating post:', error);
    const err = error as Error;
    if (err?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create post", details: err?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}