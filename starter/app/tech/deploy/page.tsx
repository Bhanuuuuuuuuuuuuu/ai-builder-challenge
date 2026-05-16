"use client";

import { useState } from "react";
import { ScanInput } from "../../../components/ScanInput";

type Step = "asset" | "location" | "done";

type AssetState =
  | "unreceived"
  | "received"
  | "stored"
  | "in_service"
  | "rma_pending"
  | "disposed";

type AssetSummary = {
  asset_tag: string;
  serial: string;
  model: string;
  manufacturer: string;
  state: AssetState;
  custodian: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (!isRecord(data)) return fallback;

  const error = data.error;

  if (typeof error === "string") return error;

  if (isRecord(error)) {
    if (typeof error.message === "string") return error.message;
    if (typeof error.code === "string") return error.code;
  }

  return fallback;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isDeployAllowed(state: AssetState): boolean {
  return state === "received" || state === "stored";
}

function deployStateMessage(state: AssetState): string {
  if (state === "in_service") {
    return "This asset is already in service, so it cannot be deployed again.";
  }

  if (state === "disposed") {
    return "This asset is disposed, so it cannot be deployed.";
  }

  if (state === "rma_pending") {
    return "This asset is pending RMA, so it should not be deployed.";
  }

  if (state === "unreceived") {
    return "This asset has not been received yet.";
  }

  return "This asset can be deployed.";
}

function isCompleteDeployLocation(value: string): boolean {
  const parts = value
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length === 5;
}

export default function TechDeployPage() {
  const [assetTag, setAssetTag] = useState("");
  const [asset, setAsset] = useState<AssetSummary | null>(null);
  const [locationTag, setLocationTag] = useState("");
  const [step, setStep] = useState<Step>("asset");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAssetScan(value: string) {
    const scannedTag = value.trim();

    setAssetTag(scannedTag);
    setAsset(null);
    setLocationTag("");
    setMessage("");
    setBusy(true);

    try {
      const res = await fetch(
        `/api/upstream/assets/${encodeURIComponent(scannedTag)}`,
        {
          cache: "no-store",
        },
      );

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Could not load asset."));
      }

      const loadedAsset = data as AssetSummary;

      setAsset(loadedAsset);

      if (!isDeployAllowed(loadedAsset.state)) {
        setMessage(`Cannot deploy: ${deployStateMessage(loadedAsset.state)}`);
        setStep("asset");
        return;
      }

      setStep("location");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `Could not load asset: ${err.message}`
          : "Could not load asset.",
      );
      setStep("asset");
    } finally {
      setBusy(false);
    }
  }

  async function handleLocationScan(value: string) {
    const scannedLocation = value.trim();

    setLocationTag(scannedLocation);
    setMessage("");

    if (!isCompleteDeployLocation(scannedLocation)) {
      setMessage(
        "Deploy location must include site, room, row, rack, and RU. Example: Lab-Building-A/Bay-12/Aisle-3/B-04/P-02",
      );
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/assets/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetTag,
          locationTag: scannedLocation,
        }),
      });

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(getErrorMessage(data, "Deploy request failed."));
      }

      setMessage(`Asset ${assetTag} deployed to ${scannedLocation}.`);
      setStep("done");

      if (isRecord(data)) {
        setAsset(data as AssetSummary);
      }
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `Could not deploy asset: ${err.message}`
          : "Could not deploy asset.",
      );
    } finally {
      setBusy(false);
    }
  }

  function resetWorkflow() {
    setAssetTag("");
    setAsset(null);
    setLocationTag("");
    setMessage("");
    setStep("asset");
    setBusy(false);
  }

  const messageIsSuccess = step === "done";
  const canContinueToLocation = asset && isDeployAllowed(asset.state);

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deploy Asset</h1>
        <p className="text-gray-600 mt-2">
          Scan an asset tag, confirm it is eligible, then scan a full rack
          location with RU.
        </p>
      </div>

      <div className="rounded-lg border p-4 bg-white space-y-4">
        <div>
          <p className="text-sm text-gray-500">Step 1</p>
          <p className="font-medium">
            Asset: {assetTag || "Not scanned yet"}
          </p>
        </div>

        {asset ? (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p>
              <strong>Model:</strong> {asset.manufacturer} {asset.model}
            </p>
            <p>
              <strong>Serial:</strong> {asset.serial}
            </p>
            <p>
              <strong>Current state:</strong>{" "}
              <span
                className={
                  canContinueToLocation
                    ? "font-semibold text-green-700"
                    : "font-semibold text-red-700"
                }
              >
                {asset.state.replaceAll("_", " ")}
              </span>
            </p>
            <p>
              <strong>Custodian:</strong> {asset.custodian}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-sm text-gray-500">Step 2</p>
          <p className="font-medium">
            Location: {locationTag || "Not scanned yet"}
          </p>
        </div>
      </div>

      {step === "asset" && (
        <ScanInput
          label="Scan asset tag"
          placeholder="Example: C0000101"
          onScan={handleAssetScan}
          disabled={busy}
        />
      )}

      {step === "location" && (
        <ScanInput
          label="Scan deploy location"
          placeholder="Example: Lab-Building-A/Bay-12/Aisle-3/B-04/P-02"
          onScan={handleLocationScan}
          disabled={busy}
        />
      )}

      {message && (
        <div
          className={`rounded-lg p-4 ${
            messageIsSuccess
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={resetWorkflow}
        className="rounded-lg bg-gray-900 text-white px-4 py-3 font-medium disabled:bg-gray-400"
        disabled={busy}
      >
        {step === "done" ? "Deploy another asset" : "Reset"}
      </button>
    </div>
  );
}
