# DSH Peripheral Battery Adapters

Community-maintained HID battery adapters for the **DSH peripheral-battery**
plugin. Factory adapters ship inside the plugin; this repository is for
**additional devices** contributed by the community.

## Use

The index URL is built into the plugin; no configuration is required.

1. Open **设置 → 外设电量 → 适配器市场**;
2. Search by index name / model / adapter id, or scan **新设备** to get an
   automatic VID/PID match;
3. Ask the agent to search, preview and install:

   > 在适配器市场搜索一下 ATK

The agent calls `battery_market`:

- `search` by name / model / adapter id;
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

## Experimental adapters

| Device | Match | Status | Notes |
|---|---|---|---|
| MCHOSE L7/M7/A7/K7 | `5253` + `FF01:0001` | experimental | 0x12 Feature protocol; not hardware-tested here |
| MCHOSE A5 V2 / K7 Ultra | `3837:1001/100A/100B/100C/1012` | experimental | legacy 0x12; not hardware-tested here |
| MCHOSE K7 V2 / modern mice | `3837:1014/1016/1018/102C/102D/4028` | experimental | 0x4D device info; not hardware-tested here |
| MCHOSE G3 V2 | `3837:418C/4245` | experimental | G3 query; not hardware-tested here |
| MCHOSE K87 V3 | `3837:1015` | experimental | 20-byte keyboard info; not hardware-tested here |

Experimental adapters are reimplemented from protocol notes and test vectors.
They are not covered by the plugin's stable support claim; install only if you
accept the risk and can test the result.

## Verifying an adapter

If you have the real device:

1. Install the adapter from the plugin market;
2. Open the adapter card → **查看 → 复制验证报告**;
3. Check battery/charging/sleep/unplug behavior;
4. Submit the report with [the verification issue form](.github/ISSUE_TEMPLATE/adapter-verification.yml).

Promotion is evidence-based:

```text
experimental -> community -> verified
```

`community` still lives in the market; only `verified` can be considered for the
plugin's factory stable set. CI/test vectors alone cannot promote an adapter.

## Mirrors

- GitHub: https://github.com/wbx1217/dsh-peripheral-battery-adapters
- Gitee: https://gitee.com/yfrm/dsh-peripheral-battery-adapters

The plugin tries GitHub Pages, the Gitee raw mirror, jsDelivr and GitHub raw
automatically.

## Repository layout

```
index.json                  # index read by the plugin
adapters/<id>.js            # adapter source files
tests/                      # offline protocol tests
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
- Mark the evidence level; `verified` / `community` require real hardware,
  `experimental` may be protocol/test-vector only:
  - `verified` — maintainer verified;
  - `community` — community tested, not independently re-verified;
  - `experimental` — protocol inferred / test-vector only, not confirmed.
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
