import { NextResponse } from "next/server";

const UPSTREAM = (process.env.API_BASE_URL ?? "http://localhost:8080/v1").replace(
  /\/$/,
  "",
);

export async function POST(req: Request) {
  const token = process.env.API_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error: "API_TOKEN missing. Check starter/.env and restart npm run dev.",
      },
      { status: 500 },
    );
  }

  const body = await req.json();

  const assetTag = String(body.assetTag ?? "").trim();
  const toCustodian = String(body.toCustodian ?? "").trim();

  if (!assetTag || !toCustodian) {
    return NextResponse.json(
      { error: "Missing assetTag or toCustodian" },
      { status: 400 },
    );
  }

  const upstreamRes = await fetch(`${UPSTREAM}/scans/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asset_tag: assetTag,
      to_custodian: toCustodian,
      user_id: "tech-jane",
      scan_payload: `${assetTag} ${toCustodian}`,
    }),
    cache: "no-store",
  });

  const text = await upstreamRes.text();

  return new NextResponse(text, {
    status: upstreamRes.status,
    headers: {
      "Content-Type":
        upstreamRes.headers.get("content-type") ?? "application/json",
    },
  });
}
