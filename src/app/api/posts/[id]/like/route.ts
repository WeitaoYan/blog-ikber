import { NextRequest, NextResponse } from "next/server";
import { getLikeCount, incrementLike } from "@/lib/db";
import { LIKED_POSTS_COOKIE } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const slug = params.id;
    const count = await getLikeCount(slug);
    return NextResponse.json({ count });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get like count" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const slug = params.id;

    // Check if already liked via cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    let likedPosts: string[] = [];

    for (const cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === LIKED_POSTS_COOKIE && value) {
        try {
          likedPosts = JSON.parse(decodeURIComponent(value));
        } catch {
          likedPosts = [];
        }
        break;
      }
    }

    if (likedPosts.includes(slug)) {
      const count = await getLikeCount(slug);
      return NextResponse.json(
        { error: "Already liked", count },
        { status: 409 },
      );
    }

    // Increment like count
    const count = await incrementLike(slug);

    // Add to liked posts cookie
    likedPosts.push(slug);
    const response = NextResponse.json({ count });
    response.cookies.set(LIKED_POSTS_COOKIE, JSON.stringify(likedPosts), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Failed to like post" }, { status: 500 });
  }
}
