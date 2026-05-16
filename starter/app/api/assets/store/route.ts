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

type AssetBeforeStore = {
  asset_tag: string;
  state: string;
};

function parseLocation(raw: string): Location {
  const value = raw.trim();

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

  return {
    site: "Lab-Building-A",
    room: "Storage",
    row: null,
    rack: value,
    ru: null,
  };
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

async function getAssetBeforeStore(
  token: string,
  assetTag: string,
): Promise<AssetBeforeStore | null> {
  const res = await fetch(`${UPSTREAM}/assets/${encodeURIComponent(assetTag)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as AssetBeforeStore;
}

async function removeFacilitiesRack(
  token: string,
  assetTag: string,
): Promise<void> {
  const res = await fetch(`${UPSTREAM}/mock/facilities/spaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tagged_id: assetTag,
      rack_location: null,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Facilities de-rack failed: ${await readError(res)}`);
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

  const beforeStore = await getAssetBeforeStore(token, assetTag);
  const location = parseLocation(locationTag);

  const scanRes = await fetch(`${UPSTREAM}/scans/store`, {
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

  if (beforeStore?.state === "in_service") {
    try {
      await removeFacilitiesRack(token, assetTag);
    } catch (err) {
      return NextResponse.json(
        {
          error: {
            code: "external_sync_failed",
            message:
              err instanceof Error
                ? err.message
                : "Store succeeded, but facilities sync failed.",
          },
          asset: JSON.parse(text),
        },
        { status: 502 },
      );
    }
  }

  return new NextResponse(text, {
    status: scanRes.status,
    headers: {
      "Content-Type":
        scanRes.headers.get("content-type") ?? "application/json",
    },
  });
}
