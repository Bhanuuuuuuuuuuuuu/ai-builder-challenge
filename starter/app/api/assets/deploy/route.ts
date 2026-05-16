import { NextResponse } from "next/server";

const UPSTREAM = (process.env.API_BASE_URL ?? "http://localhost:8080/v1").replace(
  /\/$/,
  "",
);

type Location = {
  site: string;
  room: string;
  row?: string | null;
  rack: string;
  ru: string;
};

function parseDeployLocation(raw: string): Location | null {
  const value = raw.trim();

  if (!value.includes("/")) {
    return null;
  }

  const parts = value.split("/").map((x) => x.trim()).filter(Boolean);

  // Example with row:
  // Lab-Building-A/Bay-12/Aisle-3/B-04/P-02
  if (parts.length >= 5) {
    const [site, room, row, rack, ru] = parts;

    if (!site || !room || !rack || !ru) return null;

    return {
      site,
      room,
      row,
      rack,
      ru,
    };
  }

  // Example without row:
  // Lab-Building-A/Bay-12/B-04/P-02
  if (parts.length === 4) {
    const [site, room, rack, ru] = parts;

    if (!site || !room || !rack || !ru) return null;

    return {
      site,
      room,
      row: null,
      rack,
      ru,
    };
  }

  return null;
}

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
  const locationTag = String(body.locationTag ?? "").trim();

  if (!assetTag || !locationTag) {
    return NextResponse.json(
      { error: "Missing assetTag or locationTag" },
      { status: 400 },
    );
  }

  const location = parseDeployLocation(locationTag);

  if (!location) {
    return NextResponse.json(
      {
        error: {
          code: "incomplete_deploy_location",
          message:
            "Deploy location must include site, room, rack, and RU. Example: Lab-Building-A/Bay-12/Aisle-3/B-04/P-02",
        },
      },
      { status: 422 },
    );
  }

  const upstreamRes = await fetch(`${UPSTREAM}/scans/deploy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asset_tag: assetTag,
      location,
      user_id: "tech-jane",
      scan_payload: `${assetTag} ${locationTag}`,
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
