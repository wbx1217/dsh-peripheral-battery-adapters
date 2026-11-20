# Contributing

Thanks for adding a device! Adapters are executable JavaScript with HID access,
so every submission is reviewed before merge.

## Add an adapter

1. Copy `examples/adapter-example.js` to `adapters/<your-id>.js`.
2. Implement:

   ```js
   defineAdapter({
     id: 'your-id',
     name: 'Device name',
     kind: 'mouse',
     transport: '2.4G HID',
     match: { vid: '1234', pid: '5678', usagePage: 'FF02' },
     async read(io) {
       // Send the query frame and parse the reply.
       return { percent: 87, charging: false }
     },
   })
   ```

3. Test it in the plugin with the real device. The bottom bar must show the
   reading, and `battery_status` must report `online`.
4. Add an entry to `index.json`:

   ```json
   {
     "id": "your-id",
     "name": "Device name",
     "model": "Vendor Model",
     "kind": "mouse",
     "transport": "2.4G HID",
     "match": { "vid": "1234", "pid": "5678", "usagePage": "FF02" },
     "file": "adapters/your-id.js",
     "sha256": "<lowercase sha256 of the file>",
     "author": "your-github-name",
     "status": "community",
     "notes": "Tested on <model / firmware>"
   }
   ```

5. Compute the hash:

   ```powershell
   (Get-FileHash -Algorithm SHA256 -LiteralPath .\adapters\your-id.js).Hash.ToLower()
   ```

   ```bash
   shasum -a 256 adapters/your-id.js | cut -d' ' -f1
   ```

6. Run the validator:

   ```bash
   node scripts/validate.mjs
   ```

7. Open a pull request. CI runs the same validator.

## Status values

- `verified` — maintainer verified on real hardware;
- `community` — author tested; not independently re-verified;
- `experimental` — protocol inferred but not confirmed.

Start with `community` unless a maintainer has verified the device.

## Rules

- The adapter must only operate on the device declared in `match`.
- Do not use network, filesystem, process, registry or firmware-update APIs.
- Do not obfuscate source or hide the query frames.
- `read(io)` must return `percent` in `0–100`; `charging` may be `null`.
- `name` is the display name shown in search; `model` is the product model used
  for search (e.g. `MCHOSE G87`). Both may be any language; Chinese names are
  welcome but not required.
- Keep one adapter per device family. Do not submit a new adapter with an `id`
  already present in `index.json`; factory adapters are mirrored in the index
  as built-in entries and do not need reinstalling.

## Review

A maintainer checks:

1. source readability and device scope;
2. `sha256`, `id` and `match` consistency;
3. whether real-hardware evidence is sufficient for the claimed status;
4. no unrelated writes or side effects.

Unsafe or unverifiable submissions are closed with an explanation.
