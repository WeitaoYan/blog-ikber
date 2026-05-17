import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const settings = await getAllSettings();

    return NextResponse.json({
      donateWechat: settings.donate_wechat || "",
      donateAlipay: settings.donate_alipay || "",
      blogTitle: settings.blog_title || "My Blog",
      blogDescription: settings.blog_description || "",
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: "Failed to fetch settings", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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
    const { donateWechat, donateAlipay, blogTitle, blogDescription } = body;

    // Save each setting to database using snake_case keys
    if (donateWechat !== undefined) {
      await setSetting("donate_wechat", donateWechat);
    }
    if (donateAlipay !== undefined) {
      await setSetting("donate_alipay", donateAlipay);
    }
    if (blogTitle !== undefined) {
      await setSetting("blog_title", blogTitle);
    }
    if (blogDescription !== undefined) {
      await setSetting("blog_description", blogDescription);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { error: "Failed to save settings", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}