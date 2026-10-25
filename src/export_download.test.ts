import assert from "node:assert/strict";
import { exportRequest, makeCsv } from "./export_download.js";

const exceptionInput = {
  shipmentId: "SHP-42",
  events: [{ occurredAt: "2026-10-22T08:00:00Z", status: "in_transit", location: "Osaka" }],
  proofOfDelivery: [],
  exception: { code: "CUSTOMS_HOLD", note: "Document review" }
};

const parsed = exportRequest.parse(exceptionInput);
assert.equal(makeCsv(parsed), "shipment_id,state,event_count,proof_file_count\n\"SHP-42\",\"exception:CUSTOMS_HOLD\",\"1\",\"0\"\n");
assert.throws(() => exportRequest.parse({ shipmentId: "", events: [], proofOfDelivery: [] }));
console.log("export decision test passed");
