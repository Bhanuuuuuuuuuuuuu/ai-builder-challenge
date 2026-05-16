import { NextResponse } from "next/server";

const UPSTREAM = (process.env.API_BASE_URL ?? "http://localhost:8080/v1").replace(
  /\/$/,
  "",
);

type Location = {
  site: string;
  room: string;
  row?: string | null;
  rack?: string | null;
  ru?: string | null;
};

function parseLocation(raw: string): Location {
  const value = raw.trim();

  // Example:
  // Lab-Building-A/Bay-12/Aisle-3/B-04/P-02
  if (value.includes("/")) {
    const [site, room, row, rack, ru] = value.split("/").map((x) => x.trim());

    return {
      site: site || "Lab-Building-A",
      room: room || "Storage",
      row: row || null,
      rack: rack || null,
      ru: ru || null,
    };
  }

  // Simple typed scan like Rack-B-04
  return {
    site: "Lab-Building-A",
    room: "Storage",
    row: null,
    rack: value,
    ru: null,
  };
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

  const location = parseLocation(locationTag);

  const upstreamRes = await fetch(
    `${UPSTREAM}/scans/store`,
    {
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
    },
  );

  const text = await upstreamRes.text();

  return new NextResponse(text, {
    status: upstreamRes.status,
    headers: {
      "Content-Type":
        upstreamRes.headers.get("content-type") ?? "application/json",
    },
  });
}
