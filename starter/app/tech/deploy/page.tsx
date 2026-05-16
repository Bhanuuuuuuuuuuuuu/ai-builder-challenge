"use client";

import { useState } from "react";
import { ScanInput } from "../../../components/ScanInput";

type Step = "asset" | "location" | "done";

export default function TechDeployPage() {
  const [assetTag, setAssetTag] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [step, setStep] = useState<Step>("asset");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function handleAssetScan(value: string) {
    setAssetTag(value);
    setMessage("");
    setStep("location");
  }

  async function handleLocationScan(value: string) {
    setLocationTag(value);
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/assets/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetTag,
          locationTag: value,
        }),
      });

      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!res.ok) {
        const backendMessage =
          data?.error?.message ||
          data?.error?.code ||
          data?.error ||
          text ||
          "Deploy request failed";

        throw new Error(backendMessage);
      }

      setMessage(`Asset ${assetTag} deployed to ${value}.`);
      setStep("done");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `Could not deploy asset: ${err.message}`
          : "Could not deploy asset",
      );
    } finally {
      setBusy(false);
    }
  }

  function resetWorkflow() {
    setAssetTag("");
    setLocationTag("");
    setMessage("");
    setStep("asset");
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deploy Asset</h1>
        <p className="text-gray-600 mt-2">
          Scan an asset tag, then scan the rack location with RU.
        </p>
      </div>

      <div className="rounded-lg border p-4 bg-white space-y-4">
        <div>
          <p className="text-sm text-gray-500">Step 1</p>
          <p className="font-medium">
            Asset: {assetTag || "Not scanned yet"}
          </p>
        </div>

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
          placeholder="Scan asset tag..."
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
            step === "done"
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
