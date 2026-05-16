import QRCode from "qrcode";
import { api } from "../../../lib/api-client";
import type { Asset } from "../../../lib/types";

export const dynamic = "force-dynamic";

type BarcodeItem = {
  group: string;
  label: string;
  value: string;
  note: string;
};

type RenderedBarcodeItem = BarcodeItem & {
  svg: string;
};

function firstAssetByState(assets: Asset[], state: string): Asset | undefined {
  return assets.find((asset) => asset.state === state);
}

async function getAssetExamples(): Promise<BarcodeItem[]> {
  try {
    const assets = await api.assets.list();

    const examples = [
      {
        group: "Assets",
        label: "In-service asset",
        asset: firstAssetByState(assets, "in_service"),
        note: "Useful for store, deploy error, transfer, and manager detail checks.",
      },
      {
        group: "Assets",
        label: "Stored asset",
        asset: firstAssetByState(assets, "stored"),
        note: "Useful for deploy happy path.",
      },
      {
        group: "Assets",
        label: "Received asset",
        asset: firstAssetByState(assets, "received"),
        note: "Useful for store happy path.",
      },
      {
        group: "Assets",
        label: "Disposed asset",
        asset: firstAssetByState(assets, "disposed"),
        note: "Useful for invalid scan transition checks.",
      },
      {
        group: "Assets",
        label: "RMA pending asset",
        asset: firstAssetByState(assets, "rma_pending"),
        note: "Useful for blocked workflow checks.",
      },
    ];

    return examples
      .filter((example) => example.asset)
      .map((example) => ({
        group: example.group,
        label: example.label,
        value: example.asset!.asset_tag,
        note: example.note,
      }));
  } catch {
    return [
      {
        group: "Assets",
        label: "Known seeded asset",
        value: "C0000101",
        note: "Fallback seeded asset if the API is unavailable while printing.",
      },
      {
        group: "Assets",
        label: "Demo receive asset",
        value: "C0009001",
        note: "Useful for receive demo after reset.",
      },
    ];
  }
}

async function makeQrSvg(value: string): Promise<string> {
  return QRCode.toString(value, {
    type: "svg",
    margin: 1,
    width: 180,
    errorCorrectionLevel: "M",
  });
}

async function getBarcodeItems(): Promise<RenderedBarcodeItem[]> {
  const assetItems = await getAssetExamples();

  const fixedItems: BarcodeItem[] = [
    {
      group: "Assets",
      label: "Demo receive asset",
      value: "C0009001",
      note: "Use this for a clean receive demo after reset.",
    },
    {
      group: "Serials",
      label: "Demo serial",
      value: "SN-DEMO-1",
      note: "Serial number for the demo receive flow.",
    },
    {
      group: "Locations",
      label: "Receiving location",
      value: "Lab-Building-A/Receiving",
      note: "Use for receive.",
    },
    {
      group: "Locations",
      label: "Storage location",
      value: "Lab-Building-A/Bay-12/Aisle-3/B-04",
      note: "Use for store.",
    },
    {
      group: "Locations",
      label: "Deploy rack + RU",
      value: "Lab-Building-A/Bay-12/Aisle-3/B-04/P-02",
      note: "Use for deploy. Includes the required RU.",
    },
    {
      group: "Badges",
      label: "Receiving custodian",
      value: "tech-sam",
      note: "Use for transfer.",
    },
    {
      group: "Badges",
      label: "Alternate custodian",
      value: "tech-alex",
      note: "Use to test same-custodian vs different-custodian cases.",
    },
  ];

  const uniqueItems = [...assetItems, ...fixedItems].filter(
    (item, index, allItems) =>
      allItems.findIndex((other) => other.value === item.value) === index,
  );

  return Promise.all(
    uniqueItems.map(async (item) => ({
      ...item,
      svg: await makeQrSvg(item.value),
    })),
  );
}

export default async function DevBarcodesPage() {
  const items = await getBarcodeItems();

  const groups = Array.from(new Set(items.map((item) => item.group)));

  return (
    <main className="space-y-8 p-6">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">
          Dev barcodes
        </h1>
        <p className="mt-2 text-slate-600">
          Print this page or scan directly from the screen. These QR codes cover
          the common demo paths: receive, store, deploy, transfer, and error
          handling.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group} className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-950">{group}</h2>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items
              .filter((item) => item.group === group)
              .map((item) => (
                <div
                  key={item.value}
                  className="rounded-xl border bg-white p-5 shadow-sm break-inside-avoid"
                >
                  <div
                    className="mx-auto flex justify-center"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />

                  <h3 className="mt-4 font-semibold text-slate-950">
                    {item.label}
                  </h3>

                  <p className="mt-2 rounded-lg bg-slate-50 p-2 font-mono text-sm text-slate-800">
                    {item.value}
                  </p>

                  <p className="mt-2 text-sm text-slate-600">{item.note}</p>
                </div>
              ))}
          </div>
        </section>
      ))}

      <section className="rounded-xl border bg-slate-50 p-5 text-sm text-slate-700">
        <h2 className="font-semibold text-slate-950">Suggested demo path</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Reset the namespace.</li>
          <li>Receive C0009001 with SN-DEMO-1.</li>
          <li>Store C0009001 at the storage location.</li>
          <li>Deploy C0009001 to the rack + RU location.</li>
          <li>Transfer C0009001 to tech-sam.</li>
          <li>Open manager detail and reconciliation.</li>
        </ol>
      </section>
    </main>
  );
}
