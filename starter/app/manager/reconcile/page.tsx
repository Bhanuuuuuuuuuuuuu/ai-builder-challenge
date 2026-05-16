"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type ReconcileReport = {
  generated_at: string;
  totals: {
    assets: number;
    facilities_records: number;
    finance_records: number;
    issues: number;
    critical: number;
    warning: number;
    info: number;
  };
  issues: ReconcileIssue[];
};

function severityClass(severity: IssueSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "warning":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "info":
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ManagerReconcilePage() {
  const [report, setReport] = useState<ReconcileReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch("/api/reconcile", {
          cache: "no-store",
        });

        const text = await res.text();

        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (!res.ok) {
          const message =
            data?.error?.message ||
            data?.error?.code ||
            text ||
            "Could not load reconciliation report.";

          throw new Error(message);
        }

        setReport(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load reconciliation report.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-600">Loading reconciliation report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <Link
          href="/manager"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to manager dashboard
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
          <h1 className="text-xl font-bold">Could not load report</h1>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <Link
          href="/manager"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          ← Back to manager dashboard
        </Link>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Reconciliation report
            </h1>
            <p className="mt-2 text-slate-600">
              Compares operations assets with facilities rack records and finance
              equipment records.
            </p>
          </div>

          <p className="text-sm text-slate-500">
            Generated {formatDate(report.generated_at)}
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Assets</p>
          <p className="mt-2 text-2xl font-bold">{report.totals.assets}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Facilities</p>
          <p className="mt-2 text-2xl font-bold">
            {report.totals.facilities_records}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Finance</p>
          <p className="mt-2 text-2xl font-bold">
            {report.totals.finance_records}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Critical</p>
          <p className="mt-2 text-2xl font-bold text-red-700">
            {report.totals.critical}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Warnings</p>
          <p className="mt-2 text-2xl font-bold text-yellow-700">
            {report.totals.warning}
          </p>
        </div>
      </section>

      {report.issues.length === 0 ? (
        <section className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-900">
          <h2 className="text-xl font-semibold">No reconciliation issues</h2>
          <p className="mt-2">
            Operations, facilities, and finance are currently aligned.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-xl font-semibold text-slate-950">
              Issues to investigate
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              These are grouped as critical, warning, or info based on likely
              business impact.
            </p>
          </div>

          <div className="divide-y">
            {report.issues.map((issue, index) => (
              <div key={`${issue.asset_tag}-${issue.type}-${index}`} className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/manager/assets/${issue.asset_tag}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {issue.asset_tag}
                      </Link>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${severityClass(
                          issue.severity,
                        )}`}
                      >
                        {issue.severity}
                      </span>

                      {issue.asset_state ? (
                        <span className="rounded-full border bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {issue.asset_state.replaceAll("_", " ")}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="mt-3 font-semibold text-slate-950">
                      {issue.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {issue.details}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-slate-500">Operations location</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {issue.ops_location || "—"}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-slate-500">Facilities location</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {issue.facilities_location || "—"}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <dt className="text-slate-500">Finance status</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {issue.finance_status || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
