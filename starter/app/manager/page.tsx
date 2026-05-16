import Link from "next/link";
import { api } from "../../lib/api-client";
import type { Asset } from "../../lib/types";

type ManagerPageProps = {
  searchParams?: Promise<{
    state?: string;
    site?: string;
    custodian?: string;
    q?: string;
  }>;
};

function formatLocation(asset: Asset) {
  const { site, room, row, rack, ru } = asset.location;

  const parts = [
    site,
    room,
    row ? `Row ${row}` : null,
    rack ? `Rack ${rack}` : null,
    ru ? `RU ${ru}` : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function stateLabel(state: string) {
  return state.replaceAll("_", " ");
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

export default async function ManagerLandingPage({
  searchParams,
}: ManagerPageProps) {
  const params = (await searchParams) ?? {};

  const assets = await api.assets.list({
    state: params.state || undefined,
    site: params.site || undefined,
    custodian: params.custodian || undefined,
  });

  const query = params.q?.toLowerCase().trim() ?? "";

  const filteredAssets = query
    ? assets.filter((asset) => {
        const haystack = [
          asset.asset_tag,
          asset.serial,
          asset.model,
          asset.manufacturer,
          asset.asset_class,
          asset.state,
          asset.custodian,
          formatLocation(asset),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
    : assets;

  const totalAssets = filteredAssets.length;
  const inServiceCount = filteredAssets.filter(
    (asset) => asset.state === "in_service",
  ).length;
  const needsAttentionCount = filteredAssets.filter((asset) =>
    ["received", "rma_pending", "unreceived"].includes(asset.state),
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">Manager view</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Asset dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            A quick morning view of where assets are, who has custody, and which
            items need attention before standup.
          </p>
        </div>

        <Link
          href="/manager/reconcile"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Open reconciliation report
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Visible assets</p>
          <p className="mt-2 text-3xl font-bold">{totalAssets}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">In service</p>
          <p className="mt-2 text-3xl font-bold">{inServiceCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Needs attention</p>
          <p className="mt-2 text-3xl font-bold">{needsAttentionCount}</p>
        </div>
      </section>

      <form className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Search</span>
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Tag, model, serial..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">State</span>
            <select
              name="state"
              defaultValue={params.state ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All states</option>
              <option value="unreceived">Unreceived</option>
              <option value="received">Received</option>
              <option value="stored">Stored</option>
              <option value="in_service">In service</option>
              <option value="rma_pending">RMA pending</option>
              <option value="disposed">Disposed</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Site</span>
            <input
              name="site"
              defaultValue={params.site ?? ""}
              placeholder="e.g. SFO"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Custodian
            </span>
            <input
              name="custodian"
              defaultValue={params.custodian ?? ""}
              placeholder="e.g. tech-jane"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply filters
          </button>
          <Link
            href="/manager"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold text-slate-950">Assets</h2>
          <p className="mt-1 text-sm text-slate-500">
            Showing {filteredAssets.length} asset
            {filteredAssets.length === 1 ? "" : "s"}.
          </p>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              No assets match those filters.
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Try clearing the state filter or searching by asset tag.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Asset</th>
                  <th className="px-5 py-3">State</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Custodian</th>
                  <th className="px-5 py-3">Updated</th>
                  <th className="px-5 py-3">Attention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.slice(0, 100).map((asset) => (
                  <tr key={asset.asset_tag} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/manager/assets/${asset.asset_tag}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {asset.asset_tag}
                      </Link>
                      <div className="mt-1 text-slate-500">
                        {asset.manufacturer} {asset.model}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${stateBadgeClass(
                          asset.state,
                        )}`}
                      >
                        {stateLabel(asset.state)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {formatLocation(asset) || "No location"}
                    </td>

                    <td className="px-5 py-4 text-slate-700">
                      {asset.custodian}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {formatDate(asset.updated_at)}
                    </td>

                    <td className="px-5 py-4">
                      {asset.state === "rma_pending" ? (
                        <span className="text-sm font-medium text-red-700">
                          RMA follow-up
                        </span>
                      ) : asset.state === "received" ? (
                        <span className="text-sm font-medium text-yellow-700">
                          Needs storage
                        </span>
                      ) : asset.state === "unreceived" ? (
                        <span className="text-sm font-medium text-orange-700">
                          Not received
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAssets.length > 100 ? (
              <div className="border-t bg-slate-50 px-5 py-3 text-sm text-slate-600">
                Showing first 100 results. Use filters to narrow the list.
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}