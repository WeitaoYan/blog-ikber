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
      // Admin view - requires auth, shows all posts including drafts
      const authenticated = await requireAuth(request);
      if (!authenticated) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const result = await getAllPostsAdmin(page, limit);
      return NextResponse.json(result);
    }

    // Public view - only published posts
    const result = await getPosts(page, limit, tag);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch posts" },
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

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required" },
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
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 },
    );
  }
}
