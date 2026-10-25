import { z } from "zod";
import { infrai } from "./infrai.js";

const BUCKET = "logistics-csv-exports";

export const exportRequest = z.object({
  shipmentId: z.string().min(1),
  events: z.array(z.object({
    occurredAt: z.string(), status: z.string(), location: z.string()
  })).min(1),
  proofOfDelivery: z.array(z.object({ name: z.string(), contentType: z.string(), key: z.string() })),
  exception: z.object({ code: z.string(), note: z.string() }).optional()
});

export type ExportRequest = z.infer<typeof exportRequest>;

export function shipmentRow(input: ExportRequest): string[] {
  const state = input.exception ? `exception:${input.exception.code}` : input.events.at(-1)?.status ?? "unknown";
  return [input.shipmentId, state, String(input.events.length), String(input.proofOfDelivery.length)];
}

export function makeCsv(input: ExportRequest): string {
  return [
    "shipment_id,state,event_count,proof_file_count",
    shipmentRow(input).map((value) => `"${value.replaceAll('"', '""')}"`).join(",")
  ].join("\n") + "\n";
}

export async function createExport(raw: unknown) {
  const input = exportRequest.parse(raw);
  await infrai.storage.bucket.create({ name: BUCKET });
  const key = `exports/${input.shipmentId}.csv`;
  await infrai.storage.object.put(BUCKET, key, {
    data_base64: Buffer.from(makeCsv(input)).toString("base64"), content_type: "text/csv"
  });
  const download = await infrai.storage.object.presign(BUCKET, key, {
    op: "get", expires_seconds: 900, response_disposition: `attachment; filename="${input.shipmentId}.csv"`,
    idempotency_key: `export-${input.shipmentId}`
  });
  const document = await infrai.pdf.generate({
    markdown: `# Shipment ${input.shipmentId}\n\nState: ${shipmentRow(input)[1]}\n\nCSV object: ${key}`,
    page_size: "A4", orientation: "portrait", store: true
  });
  return { shipmentId: input.shipmentId, downloadUrl: download.url, document };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = { shipmentId: "SHP-1007", events: [{ occurredAt: "2026-10-22T08:00:00Z", status: "delivered", location: "Ningbo" }], proofOfDelivery: [{ name: "signed-receipt.pdf", contentType: "application/pdf", key: "pod/SHP-1007.pdf" }] };
  createExport(sample).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
