import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const color = req.nextUrl.searchParams.get("color") || "red";

  console.log(color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="27" height="27" viewBox="0 0 24 24"><path fill="${color}" stroke="#000" stroke-width="2" d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"></path></svg>`;
  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
}