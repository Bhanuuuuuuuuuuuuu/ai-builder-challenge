import { NextResponse } from "next/server";
import { api } from "../../../lib/api-client";
import type { Asset, FacilitiesRecord, FinanceRecord } from "../../../lib/types";

type IssueSeverity = "critical" | "warning" | "info";

type ReconcileIssue = {
  type: string;
  severity: IssueSeverity;
  asset_tag: string;
  title: string;
  details: string;
  asset_state?: string;
  ops_location?: string | null;
  facilities_location?: string | null;
  finance_status?: string | null;
};

function formatOpsLocation(asset: Asset): string | null {
  const { site, room, row, rack, ru } = asset.location;

  const parts = [site, room, row, rack, ru].filter(Boolean);

  return parts.length > 0 ? parts.join("/") : null;
}

function addIssue(
  issues: ReconcileIssue[],
  issue: ReconcileIssue,
): void {
  issues.push(issue);
}

export async function GET(): Promise<NextResponse> {
  try {
    const [assets, facilities, finance] = await Promise.all([
      api.assets.list(),
      api.mock.facilities(),
      api.mock.finance(),
    ]);

    const assetsByTag = new Map<string, Asset>();
    const facilitiesByTag = new Map<string, FacilitiesRecord>();
    const financeByTag = new Map<string, FinanceRecord>();

    for (const asset of assets) {
      assetsByTag.set(asset.asset_tag, asset);
    }

    for (const record of facilities) {
      facilitiesByTag.set(record.tagged_id, record);
    }

    for (const record of finance) {
      financeByTag.set(record.tag, record);
    }

    const issues: ReconcileIssue[] = [];

    for (const asset of assets) {
      const facilitiesRecord = facilitiesByTag.get(asset.asset_tag);
      const financeRecord = financeByTag.get(asset.asset_tag);
      const opsLocation = formatOpsLocation(asset);
      const facilitiesLocation = facilitiesRecord?.rack_location ?? null;
      const financeStatus = financeRecord?.status ?? null;

      if (asset.state === "in_service") {
        if (!facilitiesRecord || !facilitiesLocation) {
          addIssue(issues, {
            type: "missing_facilities_record",
            severity: "critical",
            asset_tag: asset.asset_tag,
            title: "In-service asset missing facilities rack record",
            details:
              "Operations says this asset is in service, but facilities does not show a rack location.",
            asset_state: asset.state,
            ops_location: opsLocation,
            facilities_location: facilitiesLocation,
            finance_status: financeStatus,
          });
        } else if (opsLocation !== facilitiesLocation) {
          addIssue(issues, {
            type: "rack_location_mismatch",
            severity: "critical",
            asset_tag: asset.asset_tag,
            title: "Rack location mismatch",
            details:
              "Operations and facilities disagree about where this asset is racked.",
            asset_state: asset.state,
            ops_location: opsLocation,
            facilities_location: facilitiesLocation,
            finance_status: financeStatus,
          });
        }

        if (!financeRecord) {
          addIssue(issues, {
            type: "missing_finance_record",
            severity: "warning",
            asset_tag: asset.asset_tag,
            title: "In-service asset missing finance record",
            details:
              "Operations says this asset is in service, but finance does not have an equipment record.",
            asset_state: asset.state,
            ops_location: opsLocation,
            facilities_location: facilitiesLocation,
            finance_status: financeStatus,
          });
        } else if (financeStatus !== "capitalized") {
          addIssue(issues, {
            type: "finance_status_mismatch",
            severity: "warning",
            asset_tag: asset.asset_tag,
            title: "Finance status mismatch",
            details:
              "In-service assets are expected to be capitalized in finance.",
            asset_state: asset.state,
            ops_location: opsLocation,
            facilities_location: facilitiesLocation,
            finance_status: financeStatus,
          });
        }
      }

      if (asset.state !== "in_service" && facilitiesLocation) {
        addIssue(issues, {
          type: "unexpected_facilities_rack",
          severity: "warning",
          asset_tag: asset.asset_tag,
          title: "Non-deployed asset still appears racked",
          details:
            "Operations says this asset is not in service, but facilities still has a rack location.",
          asset_state: asset.state,
          ops_location: opsLocation,
          facilities_location: facilitiesLocation,
          finance_status: financeStatus,
        });
      }
    }

    for (const record of facilities) {
      if (!assetsByTag.has(record.tagged_id)) {
        addIssue(issues, {
          type: "orphan_facilities_record",
          severity: "critical",
          asset_tag: record.tagged_id,
          title: "Facilities record has no matching asset",
          details:
            "Facilities has a tagged item that does not exist in the operations asset list.",
          facilities_location: record.rack_location,
        });
      }
    }

    for (const record of finance) {
      if (!assetsByTag.has(record.tag)) {
        addIssue(issues, {
          type: "orphan_finance_record",
          severity: "warning",
          asset_tag: record.tag,
          title: "Finance record has no matching asset",
          details:
            "Finance has an equipment record that does not exist in the operations asset list.",
          finance_status: record.status,
        });
      }
    }

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      totals: {
        assets: assets.length,
        facilities_records: facilities.length,
        finance_records: finance.length,
        issues: issues.length,
        critical: issues.filter((issue) => issue.severity === "critical").length,
        warning: issues.filter((issue) => issue.severity === "warning").length,
        info: issues.filter((issue) => issue.severity === "info").length,
      },
      issues,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "reconcile_failed",
          message:
            err instanceof Error
              ? err.message
              : "Could not build reconciliation report.",
        },
      },
      { status: 500 },
    );
  }
}
