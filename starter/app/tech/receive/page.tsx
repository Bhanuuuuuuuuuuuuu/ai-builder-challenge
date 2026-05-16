"use client";

import { useState } from "react";
import { ScanInput } from "../../../components/ScanInput";

type Step = "asset" | "serial" | "model" | "manufacturer" | "location" | "done";

type AssetClass =
  | "instrument"
  | "compute"
  | "network"
  | "power"
  | "consumable_durable";

export default function TechReceivePage() {
  const [assetTag, setAssetTag] = useState("");
  const [serial, setSerial] = useState("");
  const [model, setModel] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [assetClass, setAssetClass] = useState<AssetClass>("instrument");
  const [locationTag, setLocationTag] = useState("");
  const [step, setStep] = useState<Step>("asset");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function handleAssetScan(value: string) {
    setAssetTag(value);
    setMessage("");
    setStep("serial");
  }

  function handleSerialScan(value: string) {
    setSerial(value);
    setMessage("");
    setStep("model");
  }

  function handleModelScan(value: string) {
    setModel(value);
    setMessage("");
    setStep("manufacturer");
  }

  function handleManufacturerScan(value: string) {
    setManufacturer(value);
    setMessage("");
    setStep("location");
  }

  async function handleLocationScan(value: string) {
    setLocationTag(value);
    setBusy(true);
    setMessage("");

    try {
      const res = await fetch("/api/assets/receive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetTag,
          serial,
          model,
          manufacturer,
          assetClass,
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
          "Receive request failed";

        throw new Error(backendMessage);
      }

      setMessage(`Asset ${assetTag} received successfully.`);
      setStep("done");
    } catch (err) {
      setMessage(
        err instanceof Error
          ? `Could not receive asset: ${err.message}`
          : "Could not receive asset",
      );
    } finally {
      setBusy(false);
    }
  }

  function resetWorkflow() {
    setAssetTag("");
    setSerial("");
    setModel("");
    setManufacturer("");
    setAssetClass("instrument");
    setLocationTag("");
    setMessage("");
    setStep("asset");
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Receive Asset</h1>
        <p className="text-gray-600 mt-2">
          Scan a new incoming asset and enter its basic details.
        </p>
      </div>

      <div className="rounded-lg border p-4 bg-white space-y-3">
        <p><strong>Asset:</strong> {assetTag || "Not scanned yet"}</p>
        <p><strong>Serial:</strong> {serial || "Not scanned yet"}</p>
        <p><strong>Model:</strong> {model || "Not entered yet"}</p>
        <p><strong>Manufacturer:</strong> {manufacturer || "Not entered yet"}</p>
        <p><strong>Class:</strong> {assetClass}</p>
        <p><strong>Location:</strong> {locationTag || "Not scanned yet"}</p>
      </div>

      {step !== "done" && (
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Asset class
          </span>
          <select
            value={assetClass}
            onChange={(e) => setAssetClass(e.target.value as AssetClass)}
            disabled={busy}
            className="w-full text-lg p-4 min-h-[44px] rounded-lg border-2 border-gray-300 focus:border-blue-600 focus:outline-none disabled:bg-gray-100"
          >
            <option value="instrument">instrument</option>
            <option value="compute">compute</option>
            <option value="network">network</option>
            <option value="power">power</option>
            <option value="consumable_durable">consumable_durable</option>
          </select>
        </label>
      )}

      {step === "asset" && (
        <ScanInput
          label="Scan asset tag"
          placeholder="Example: C0009001"
          onScan={handleAssetScan}
          disabled={busy}
        />
      )}

      {step === "serial" && (
        <ScanInput
          label="Scan serial number"
          placeholder="Example: SN-DEMO-1"
          onScan={handleSerialScan}
          disabled={busy}
        />
      )}

      {step === "model" && (
        <ScanInput
          label="Enter model"
          placeholder="Example: Demo Model 1000"
          onScan={handleModelScan}
          disabled={busy}
        />
      )}

      {step === "manufacturer" && (
        <ScanInput
          label="Enter manufacturer"
          placeholder="Example: Demo Manufacturer"
          onScan={handleManufacturerScan}
          disabled={busy}
        />
      )}

      {step === "location" && (
        <ScanInput
          label="Scan receive location"
          placeholder="Example: Lab-Building-A/Receiving"
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
        {step === "done" ? "Receive another asset" : "Reset"}
      </button>
    </div>
  );
}
