import { NextResponse } from "next/server";

const UPSTREAM = (process.env.API_BASE_URL ?? "http://localhost:8080/v1").replace(
  /\/$/,
  "",
);

type AssetClass =
  | "instrument"
  | "compute"
  | "network"
  | "power"
  | "consumable_durable";

type Location = {
  site: string;
  room: string;
  row?: string | null;
  rack?: string | null;
  ru?: string | null;
};

function parseLocation(raw: string): Location | null {
  const value = raw.trim();

  if (!value.includes("/")) {
    return null;
  }

  const [site, room, row, rack, ru] = value.split("/").map((x) => x.trim());

  if (!site || !room) {
    return null;
  }

  return {
    site,
    room,
    row: row || null,
    rack: rack || null,
    ru: ru || null,
  };
}

function isAssetClass(value: string): value is AssetClass {
  return [
    "instrument",
    "compute",
    "network",
    "power",
    "consumable_durable",
  ].includes(value);
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
  const serial = String(body.serial ?? "").trim();
  const model = String(body.model ?? "").trim();
  const manufacturer = String(body.manufacturer ?? "").trim();
  const assetClass = String(body.assetClass ?? "").trim();
  const locationTag = String(body.locationTag ?? "").trim();

  if (!assetTag || !serial || !model || !manufacturer || !assetClass || !locationTag) {
    return NextResponse.json(
      { error: "Missing receive fields" },
      { status: 400 },
    );
  }

  if (!isAssetClass(assetClass)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_asset_class",
          message:
            "Asset class must be instrument, compute, network, power, or consumable_durable.",
        },
      },
      { status: 422 },
    );
  }

  const location = parseLocation(locationTag);

  if (!location) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_location",
          message:
            "Receive location must include at least site and room. Example: Lab-Building-A/Receiving",
        },
      },
      { status: 422 },
    );
  }

  const upstreamRes = await fetch(`${UPSTREAM}/scans/receive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      asset_tag: assetTag,
      serial,
      model,
      manufacturer,
      asset_class: assetClass,
      location,
      user_id: "tech-jane",
      scan_payload: `${assetTag} ${serial} ${locationTag}`,
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
