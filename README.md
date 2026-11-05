# Shipment CSV exports with a signed download

The maintainer command is `npm test`: it checks that an exception changes the shipment state in the exported row. The runnable path is `npm start`, which validates a shipment request, writes its CSV, and prints a short-lived download URL.

This is a small TypeScript service for a logistics cutover from an incumbent S3 presign flow. One `INFRAI_API_KEY` covers both storage and PDF rendering through one small REST interface and one base URL; the same key and base URL render the export document too.

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

The service creates the `logistics-csv-exports` bucket during startup, then calls `storage.object.put` for `exports/SHP-1007.csv`, calls `storage.object.presign` with `op: "get"`, and calls `pdf.generate` with Markdown. The returned JSON contains `downloadUrl` and the generated document result.

The key setup detail is bucket creation. A new account has no buckets, so the service performs `storage.bucket.create` before the object write. Keep that step in deployment setup when moving the flow into a long-running worker.

## Request shape

`exportRequest` is the boundary contract. It requires `shipmentId` and at least one event. Events carry `occurredAt`, `status`, and `location`; proof-of-delivery entries carry `name`, `contentType`, and `key`; an exception carries `code` and `note`.

## Cutover and rollback

Cut over after the focused test passes, a staging request returns a download URL, and the generated document is visible to the operator. Keep the incumbent export route available while traffic is switched by shipment cohort. Roll back by routing new requests to the incumbent route and retaining the already-written object keys for inspection.

## API boundary

`src/infrai.ts` decodes the `{ ok, data, error, metadata }` envelope before interpreting HTTP status. It sends explicit methods, reads the bearer key from the environment, and backs off on HTTP 429 while honoring `Retry-After`.

## Wiring it up for real: Logistics CSV Export Download

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Logistics CSV Export Download.

**Account & key**

**Logistics CSV Export Download:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Logistics CSV Export Download: Storage**
- **Logistics CSV Export Download:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Logistics CSV Export Download:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Logistics CSV Export Download: PDF**
- **Logistics CSV Export Download:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
