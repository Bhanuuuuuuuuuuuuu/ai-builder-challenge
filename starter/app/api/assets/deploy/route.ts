import { NextResponse } from "next/server";

const UPSTREAM = (process.env.API_BASE_URL ?? "http://localhost:8080/v1").replace(
  /\/$/,
  "",
);

type Location = {
  site: string;
  room: string;
  row: string;
  rack: string;
  ru: string;
};

type AssetResponse = {
  asset_tag: string;
  location: Location;
};

type FinanceRecord = {
  tag: string;
  status: string;
  book_value_usd: number;
  capitalized_on: string | null;
};

function parseDeployLocation(raw: string): Location | null {
  const parts = raw
    .trim()
    .split("/")
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length !== 5) {
    return null;
  }

  const [site, room, row, rack, ru] = parts;

  if (!site || !room || !row || !rack || !ru) {
    return null;
  }

  return {
    site,
    room,
    row,
    rack,
    ru,
  };
}

function formatRackLocation(location: Location): string {
  return [
    location.site,
    location.room,
    location.row,
    location.rack,
    location.ru,
  ].join("/");
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();

  try {
    const data = JSON.parse(text);
    return data?.error?.message || data?.error?.code || text;
  } catch {
    return text;
  }
}

async function postFacilitiesRack(
  token: string,
  assetTag: string,
  rackLocation: string,
): Promise<void> {
  const res = await fetch(`${UPSTREAM}/mock/facilities/spaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tagged_id: assetTag,
      rack_location: rackLocation,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Facilities sync failed: ${await readError(res)}`);
  }
}

async function postFinanceCapitalized(
  token: string,
  assetTag: string,
): Promise<void> {
  const financeRes = await fetch(`${UPSTREAM}/mock/finance/equipment`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  let existing: FinanceRecord | undefined;

  if (financeRes.ok) {
    const records = (await financeRes.json()) as FinanceRecord[];
    existing = records.find((record) => record.tag === assetTag);
  }

  const today = new Date().toISOString().slice(0, 10);

  const res = await fetch(`${UPSTREAM}/mock/finance/equipment`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tag: assetTag,
      status: "capitalized",
      book_value_usd: existing?.book_value_usd ?? 0,
      capitalized_on: existing?.capitalized_on ?? today,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Finance sync failed: ${await readError(res)}`);
  }
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
            "Deploy location must include site, room, row, rack, and RU. Example: Lab-Building-A/Bay-12/Aisle-3/B-04/P-02",
        },
      },
      { status: 422 },
    );
  }

  const scanRes = await fetch(`${UPSTREAM}/scans/deploy`, {
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

  const text = await scanRes.text();

  if (!scanRes.ok) {
    return new NextResponse(text, {
      status: scanRes.status,
      headers: {
        "Content-Type":
          scanRes.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const deployedAsset = JSON.parse(text) as AssetResponse;
  const rackLocation = formatRackLocation(deployedAsset.location ?? location);

  try {
    await Promise.all([
      postFacilitiesRack(token, assetTag, rackLocation),
      postFinanceCapitalized(token, assetTag),
    ]);
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "external_sync_failed",
          message:
            err instanceof Error
              ? err.message
              : "Deploy succeeded, but external sync failed.",
        },
        asset: deployedAsset,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(deployedAsset, { status: scanRes.status });
}
