import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    repo: process.env.NEXT_PUBLIC_GISCUS_REPO || null,
    repoId: process.env.NEXT_PUBLIC_GISCUS_REPO_ID || null,
    category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY || null,
    categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || null,
  });
}

export const runtime = "edge";
