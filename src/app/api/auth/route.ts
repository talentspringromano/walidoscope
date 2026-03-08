import { NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/auth";
import { USER_DISPLAY_NAMES } from "@/lib/users";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const user = await verifyPassword(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Ungültige Anmeldedaten" },
      { status: 401 }
    );
  }

  const token = await createSession(user);
  const firstName = USER_DISPLAY_NAMES[user.email] ?? "";

  const response = NextResponse.json({ ok: true, firstName });
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
