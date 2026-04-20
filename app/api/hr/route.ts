import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "HR API" }, { status: 501 });
}
