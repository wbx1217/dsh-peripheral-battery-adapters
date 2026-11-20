# DSH Peripheral Battery Adapters

Community-maintained HID battery adapters for the **DSH peripheral-battery**
plugin. Factory adapters ship inside the plugin; this repository is for
**additional devices** contributed by the community.

## Use

In the plugin:

1. Open **设置 → 外设电量 → 适配器源**;
2. Enter the index URL:

   ```
   https://wbx1217.github.io/dsh-peripheral-battery-adapters/index.json
   ```

   If GitHub Pages is not available yet, use the raw URL:

   ```
   https://raw.githubusercontent.com/wbx1217/dsh-peripheral-battery-adapters/main/index.json
   ```

3. Ask the agent to search, preview and install:

   > 在适配器市场搜索一下 ATK

The agent calls `battery_market`:

- `search` by name / VID / PID / author;
- `preview` shows the full source and SHA-256;
- `install` requires `confirm: true`;
- `remove` uninstalls a market adapter.

Installed adapters go to the plugin's **user adapter directory**, never
overwriting factory adapters.

## Verified adapters

| Device | VID:PID | Status | Notes |
|---|---|---|---|
| 迈从G87 (MCHOSE G87) | `41E4:2001` | verified | 2.4G HID keyboard; verified on real hardware |
| ATK A9 Plus | `373B:1115` | verified | NearLink mouse; verified on real hardware |
| 寸渊影弑 (DARKRIM SHADOW) | `3654:6901` | verified | 2.4G RCSP headset; verified on real hardware |

These entries were verified on real hardware. The plugin already includes these
adapters, so matching ids are shown as **真机验证** (verified) and installation
is rejected; the index serves as discovery and protocol reference.

## Repository layout

```
index.json                  # index read by the plugin
adapters/<id>.js            # adapter source files
examples/adapter-example.js # template for contributors
schema/index.schema.json    # index JSON Schema
scripts/validate.mjs        # CI/local validation
.github/workflows/validate.yml
```

## Adapter requirements

- One `defineAdapter({ id, name, kind, match, read(io) })` per file.
- `id` must equal the index `id`.
- `match` must equal the index `match`.
- `read(io)` returns `{ percent, charging }` where `percent` is 0–100.
- The adapter must be tested on real hardware and marked:
  - `verified` — maintainer verified;
  - `community` — community tested, not independently re-verified;
  - `experimental` — protocol inferred but not confirmed.
- Do not access unrelated devices or write settings/firmware outside the
  declared `match`.

## Security

Adapters are executable JavaScript with HID read/write access. The plugin
checks SHA-256, `id`/`match` consistency, requires an explicit preview and
confirmation, and only writes to the user adapter directory. This repository
is curated: every adapter is reviewed before merge.

Do not submit code that:

- targets devices outside its declared `match`;
- uses network, filesystem, processes or registry access;
- attempts to modify firmware or persistent device configuration;
- obfuscates its source.

## License

MIT — see [LICENSE](LICENSE). Each adapter remains the work of its author.
