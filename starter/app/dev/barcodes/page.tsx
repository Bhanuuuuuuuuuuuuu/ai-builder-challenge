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
        note: "Useful for invalid transition checks.",
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
    <main className="barcodePage">
      <style>{`
        .barcodePage {
          max-width: 1120px;
          margin: 0 auto;
          padding: 32px;
          font-family: Arial, Helvetica, sans-serif;
          color: #0f172a;
        }

        .barcodeHeader {
          margin-bottom: 32px;
        }

        .barcodeHeader h1 {
          font-size: 36px;
          line-height: 1.1;
          margin: 0;
        }

        .barcodeHeader p {
          margin-top: 10px;
          max-width: 760px;
          color: #475569;
          font-size: 16px;
          line-height: 1.6;
        }

        .barcodeSection {
          margin-top: 36px;
        }

        .barcodeSection h2 {
          font-size: 22px;
          margin-bottom: 16px;
        }

        .barcodeGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 18px;
        }

        .barcodeCard {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: white;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
          break-inside: avoid;
        }

        .qrWrap {
          display: flex;
          justify-content: center;
        }

        .barcodeCard h3 {
          font-size: 17px;
          margin: 16px 0 8px;
        }

        .barcodeValue {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .barcodeNote {
          color: #475569;
          font-size: 14px;
          line-height: 1.5;
          margin-top: 10px;
        }

        .demoBox {
          margin-top: 36px;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          background: #f8fafc;
          padding: 20px;
        }

        .demoBox h2 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .demoBox ol {
          margin: 0;
          padding-left: 22px;
          color: #334155;
          line-height: 1.7;
        }

        @media print {
          .barcodePage {
            padding: 16px;
          }

          .barcodeCard {
            box-shadow: none;
          }
        }
      `}</style>

      <div className="barcodeHeader">
        <h1>Dev barcodes</h1>
        <p>
          Print this page or scan directly from the screen. These QR codes cover
          the common demo paths: receive, store, deploy, transfer, and error
          handling.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group} className="barcodeSection">
          <h2>{group}</h2>

          <div className="barcodeGrid">
            {items
              .filter((item) => item.group === group)
              .map((item) => (
                <div key={item.value} className="barcodeCard">
                  <div
                    className="qrWrap"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />

                  <h3>{item.label}</h3>

                  <div className="barcodeValue">{item.value}</div>

                  <p className="barcodeNote">{item.note}</p>
                </div>
              ))}
          </div>
        </section>
      ))}

      <section className="demoBox">
        <h2>Suggested demo path</h2>
        <ol>
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
