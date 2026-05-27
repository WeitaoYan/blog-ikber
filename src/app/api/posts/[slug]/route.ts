import { NextRequest, NextResponse } from "next/server";
import { getPostById, updatePost, deletePost } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

interface UpdatePostData {
  title?: string;
  slug?: string;
  content?: string;
  format?: string;
  excerpt?: string;
  tags?: string;
  published?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authenticated = await requireAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const body = await request.json();
    const updateData: UpdatePostData = {};

    // 验证字段长度限制
    if (body.title !== undefined) {
      if (body.title.length > 200) {
        return NextResponse.json(
          { error: "Title must be less than 200 characters" },
          { status: 400 }
        );
      }
      updateData.title = body.title;
    }
    if (body.slug !== undefined) {
      if (body.slug.length > 200) {
        return NextResponse.json(
          { error: "Slug must be less than 200 characters" },
          { status: 400 }
        );
      }
      updateData.slug = body.slug;
    }
    if (body.content !== undefined) {
      if (body.content.length > 100000) {
        return NextResponse.json(
          { error: "Content must be less than 100,000 characters" },
          { status: 400 }
        );
      }
      updateData.content = body.content;
    }
    if (body.format !== undefined) {
      updateData.format = body.format;
    }
    if (body.excerpt !== undefined) {
      if (body.excerpt.length > 500) {
        return NextResponse.json(
          { error: "Excerpt must be less than 500 characters" },
          { status: 400 }
        );
      }
      updateData.excerpt = body.excerpt;
    }
    if (body.tags !== undefined) updateData.tags = JSON.stringify(body.tags);
    if (body.published !== undefined)
      updateData.published = body.published ? 1 : 0;

    const post = await updatePost(id, updateData);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error: unknown) {
    const err = error as Error;
    if (err?.message?.includes("UNIQUE constraint")) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authenticated = await requireAuth(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const success = await deletePost(id);
    if (!success) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Post deleted successfully" });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 },
    );
  }
}
