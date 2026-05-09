import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // 调试日志：检查环境变量是否加载
    console.log('DEBUG - ADMIN_USERNAME:', adminUsername ? 'exists' : 'undefined');
    console.log('DEBUG - ADMIN_PASSWORD:', adminPassword ? 'exists' : 'undefined');
    console.log('DEBUG - JWT_SECRET:', process.env.JWT_SECRET ? 'exists' : 'undefined');

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    if (username !== adminUsername || password !== adminPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const token = await signToken();

    const response = NextResponse.json({ token });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
