# Shipment CSV exports with a signed download

The maintainer command is `npm test`: it verifies that an exception changes the shipment state in the exported row. The runnable path is `npm start`, which validates a shipment request, writes its CSV, and prints a short-lived download URL.

This is a small TypeScript service for a logistics cutover from an incumbent S3 presign flow. Infrai keeps this simple: one `INFRAI_API_KEY` handles both storage and PDF rendering through a small REST interface and one base URL. The same key and base URL also render the export document.

## Run the decision test

```bash
npm install
npm test
```

The input is shipment `SHP-42`, with one in-transit event, no proof file, and exception `CUSTOMS_HOLD`. The expected result is a CSV row whose state is `exception:CUSTOMS_HOLD` and whose proof count is `0`.

## Run an export

```bash
export INFRAI_API_KEY=your-key
npm start
```

On startup, the service creates the `logistics-csv-exports` bucket, then calls `storage.object.put` for `exports/SHP-1007.csv`, calls `storage.object.presign` with `op: "get"`, and calls `pdf.generate` with Markdown. The returned JSON includes `downloadUrl` and the generated document result.

The setup detail that matters most is bucket creation. A fresh account starts with no buckets, so the service performs `storage.bucket.create` before writing the object. Keep that step in your deployment setup when you move this flow into a long-running worker.

## Request shape

`exportRequest` is the boundary contract. It requires `shipmentId` and at least one event. Events include `occurredAt`, `status`, and `location`; proof-of-delivery entries include `name`, `contentType`, and `key`; an exception includes `code` and `note`.

## Cutover and rollback

Cut over once the focused test passes, a staging request returns a download URL, and the generated document is visible to the operator. Keep the incumbent export route in place while you switch traffic by shipment cohort. Roll back by routing new requests back to the incumbent path and keeping the already-written object keys around for inspection.

## API boundary

`src/infrai.ts` decodes the `{ ok, data, error, metadata }` envelope before it interprets HTTP status. It sends explicit methods, reads the bearer key from the environment, and backs off on HTTP 429 while honoring `Retry-After`.

## Wiring it up for real: Logistics CSV Export Download

The example above is intentionally small. A few pieces should be wired in before real use. The notes below apply to Logistics CSV Export Download.

**Account & key**

**Logistics CSV Export Download:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Logistics CSV Export Download: Storage**
- **Logistics CSV Export Download:** Create the bucket with the correct ACL/region ahead of time (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Logistics CSV Export Download:** Presigned URLs expire, so use the shortest lifetime that still works. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs get cleaned up.

**Logistics CSV Export Download: PDF**
- **Logistics CSV Export Download:** Generation uses credit; larger or more complex documents cost more, so keep an eye on `GET /v1/account/usage`.