import { NextRequest, NextResponse } from "next/server";
import { getPageViews, incrementPageView } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const count = await getPageViews(slug);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json(
      { error: "Failed to get page views" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Check if this visitor has already been counted via cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const viewedCookie = cookies.find((c) => c.startsWith("viewed_posts="));

    if (viewedCookie) {
      try {
        const value = viewedCookie.split("=")[1];
        const viewedPosts: string[] = JSON.parse(decodeURIComponent(value));
        if (viewedPosts.includes(slug)) {
          // Already counted this session, just return current count
          const count = await getPageViews(slug);
          return NextResponse.json({ count, alreadyCounted: true });
        }
      } catch {
        // Ignore cookie parse errors
      }
    }

    // Increment view count
    const count = await incrementPageView(slug);

    // Update cookie with this slug
    let viewedPosts: string[] = [];
    if (viewedCookie) {
      try {
        const value = viewedCookie.split("=")[1];
        viewedPosts = JSON.parse(decodeURIComponent(value));
      } catch {
        viewedPosts = [];
      }
    }
    viewedPosts.push(slug);

    const response = NextResponse.json({ count });
    response.cookies.set("viewed_posts", JSON.stringify(viewedPosts), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to record page view" },
      { status: 500 },
    );
  }
}
