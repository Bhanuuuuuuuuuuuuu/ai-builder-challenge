import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError, api } from "../../../../lib/api-client";
import type { Asset, Event } from "../../../../lib/types";

type PageProps = {
  params: Promise<{ tag: string }>;
};

function formatLocation(asset: Asset) {
  const { site, room, row, rack, ru } = asset.location;

  return [
    site,
    room,
    row ? `Row ${row}` : null,
    rack ? `Rack ${rack}` : null,
    ru ? `RU ${ru}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatEventLocation(location: Event["to_location"] | null) {
  if (!location) return "No location";

  return [
    location.site,
    location.room,
    location.row ? `Row ${location.row}` : null,
    location.rack ? `Rack ${location.rack}` : null,
    location.ru ? `RU ${location.ru}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function label(value: string | null | undefined) {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

function stateBadgeClass(state: string) {
  switch (state) {
    case "in_service":
      return "bg-green-100 text-green-800 border-green-200";
    case "stored":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "received":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "disposed":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "rma_pending":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function attentionMessage(asset: Asset) {
  if (asset.state === "received") {
    return {
      title: "Needs storage",
      body: "This asset has been received but has not been moved into storage yet.",
      className: "border-yellow-200 bg-yellow-50 text-yellow-900",
    };
  }

  if (asset.state === "rma_pending") {
    return {
      title: "RMA follow-up",
      body: "This asset is waiting on a return or vendor action.",
      className: "border-red-200 bg-red-50 text-red-900",
    };
  }

  if (asset.state === "unreceived") {
    return {
      title: "Not received",
      body: "This asset exists in the system but has not been received by operations.",
      className: "border-orange-200 bg-orange-50 text-orange-900",
    };
  }

  return null;
}

export default async function ManagerAssetDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { tag } = await params;

  try {
    const [asset, events, facilities, finance] = await Promise.all([
      api.assets.get(tag),
      api.assets.history(tag),
      api.mock.facilities(),
      api.mock.finance(),
    ]);

    const facilitiesRecord = facilities.find(
      (record) => record.tagged_id === asset.asset_tag,
    );

    const financeRecord = finance.find(
      (record) => record.tag === asset.asset_tag,
    );

    const attention = attentionMessage(asset);

    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/manager"
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              ← Back to manager dashboard
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                {asset.asset_tag}
              </h1>
              <span
                className={`rounded-full border px-3 py-1 text-sm font-medium capitalize ${stateBadgeClass(
                  asset.state,
                )}`}
              >
                {label(asset.state)}
              </span>
            </div>

            <p className="mt-2 text-slate-600">
              {asset.manufacturer} {asset.model}
            </p>
          </div>

          <div className="rounded-xl border bg-white px-4 py-3 text-sm shadow-sm">
            <p className="text-slate-500">Last updated</p>
            <p className="mt-1 font-medium text-slate-900">
              {formatDate(asset.updated_at)}
            </p>
          </div>
        </div>

        {attention ? (
          <section className={`rounded-xl border p-5 ${attention.className}`}>
            <h2 className="font-semibold">{attention.title}</h2>
            <p className="mt-1 text-sm">{attention.body}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Current location</p>
            <p className="mt-2 font-semibold text-slate-950">
              {formatLocation(asset) || "No location"}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Custodian</p>
            <p className="mt-2 font-semibold text-slate-950">
              {asset.custodian}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Asset class</p>
            <p className="mt-2 font-semibold capitalize text-slate-950">
              {label(asset.asset_class)}
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">Operations record</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Serial</dt>
                <dd className="font-medium text-slate-900">{asset.serial}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Manufacturer</dt>
                <dd className="font-medium text-slate-900">
                  {asset.manufacturer}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Model</dt>
                <dd className="font-medium text-slate-900">{asset.model}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Parent asset</dt>
                <dd className="font-medium text-slate-900">
                  {asset.parent_asset_tag ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Procurement note</dt>
                <dd className="max-w-sm text-right font-medium text-slate-900">
                  {asset.procurement_note ?? "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Facilities and finance
            </h2>

            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Facilities</p>
                {facilitiesRecord ? (
                  <dl className="mt-3 space-y-2">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Rack location</dt>
                      <dd className="font-medium text-slate-900">
                        {facilitiesRecord.rack_location}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Last observed</dt>
                      <dd className="font-medium text-slate-900">
                        {formatDate(facilitiesRecord.last_observed)}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-slate-600">
                    No facilities record. This may be expected for stored,
                    received, or disposed assets.
                  </p>
                )}
              </div>

              <div className="rounded-lg border bg-slate-50 p-4">
                <p className="font-medium text-slate-900">Finance</p>
                {financeRecord ? (
                  <dl className="mt-3 space-y-2">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Status</dt>
                      <dd className="font-medium capitalize text-slate-900">
                        {label(financeRecord.status)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Book value</dt>
                      <dd className="font-medium text-slate-900">
                        ${financeRecord.book_value_usd.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Capitalized</dt>
                      <dd className="font-medium text-slate-900">
                        {financeRecord.capitalized_on ?? "—"}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-slate-600">
                    No finance record found for this asset.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold text-slate-950">Event history</h2>
            <p className="mt-1 text-sm text-slate-500">
              The event log shows how this asset reached its current state.
            </p>
          </div>

          {events.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="font-semibold text-slate-900">
                No events recorded yet.
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Once a tech scans this asset, the timeline will appear here.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-slate-100">
              {events.map((event) => (
                <li key={event.id} className="p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold capitalize text-slate-950">
                        {label(event.event_type)}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {label(event.from_state)} → {label(event.to_state)}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        Location: {formatEventLocation(event.to_location)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Scanned by {event.user_id}
                      </p>
                    </div>

                    <div className="text-sm text-slate-500">
                      {formatDate(event.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}