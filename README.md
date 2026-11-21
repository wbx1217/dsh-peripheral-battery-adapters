# DSH 外设电量适配器

为 **DSH 外设电量**插件维护的社区 HID 电量适配器。出厂适配器随插件发布；
这个仓库只收录社区贡献的**额外设备**。

## 使用

索引地址已经内置在插件里，不需要手动配置。

1. 打开 **设置 → 外设电量 → 适配器市场**；
2. 按索引名、型号或适配器 id 搜索，或点 **新设备** 扫描，自动按 VID/PID 匹配；
3. 让 agent 搜索、预览并安装：

   > 在适配器市场搜索一下 ATK

agent 会调用 `battery_market`：

- `search`：按名称、型号或适配器 id 搜索；
- `preview`：显示完整源码和 SHA-256；
- `install`：需要 `confirm: true`；
- `remove`：卸载市场适配器。

安装后的适配器写入插件的**用户适配器目录**，不会覆盖出厂适配器。

## 已验证适配器

| 设备 | VID:PID | 状态 | 说明 |
|---|---|---|---|
| 迈从 G87（MCHOSE G87） | `41E4:2001` | verified | 2.4G HID 键盘；已真机验证 |
| ATK A9 Plus | `373B:1115` | verified | NearLink 鼠标；已真机验证 |
| 寸渊影弑（DARKRIM SHADOW） | `3654:6901` | verified | 2.4G RCSP 耳机；已真机验证 |

这些条目已在真实硬件上验证。插件本身已包含这些适配器，所以相同 id 会显示
**真机验证**，安装会被拒绝；索引在这里主要用于发现和协议参考。

## 实验性适配器

| 设备 | 匹配 | 状态 | 说明 |
|---|---|---|---|
| MCHOSE L7/M7/A7/K7 | `5253` + `FF01:0001` | experimental | 0x12 Feature 协议；本仓库未真机验证 |
| MCHOSE A5 V2 / K7 Ultra | `3837:1001/100A/100B/100C/1012` | experimental | 老款 0x12；本仓库未真机验证 |
| MCHOSE K7 V2 / 现代鼠标 | `3837:1014/1016/1018/102C/102D/4028` | experimental | 0x4D 设备信息；本仓库未真机验证 |
| MCHOSE G3 V2 | `3837:418C/4245` | experimental | G3 查询协议；本仓库未真机验证 |
| MCHOSE K87 V3 | `3837:1015` | experimental | 20 字节键盘信息；本仓库未真机验证 |

实验性适配器根据协议笔记和测试向量重写实现，不属于插件的 stable 支持承诺。
只有你愿意承担风险并能自行验证时才安装。

## 验证适配器

如果你有真实设备：

1. 从插件市场安装适配器；
2. 打开适配器卡片 → **查看 → 复制验证报告**；
3. 检查电量、充电、休眠、拔出行为；
4. 用[验证 issue 模板](.github/ISSUE_TEMPLATE/adapter-verification.yml)提交报告。

晋级依据是证据：

```text
experimental -> community -> verified
```

`community` 仍然留在市场；只有 `verified` 才可能进入插件的出厂 stable 集合。
仅凭 CI/测试向量不能晋级。

## 镜像

- GitHub：https://github.com/wbx1217/dsh-peripheral-battery-adapters
- Gitee：https://gitee.com/yfrm/dsh-peripheral-battery-adapters

插件会自动尝试 GitHub Pages、Gitee raw、jsDelivr 和 GitHub raw。

## 仓库结构

```text
index.json                  # 插件读取的索引
adapters/<id>.js            # 适配器源码
tests/                      # 离线协议测试
examples/adapter-example.js # 贡献者模板
schema/index.schema.json    # 索引 JSON Schema
scripts/validate.mjs        # CI/本地校验
.github/workflows/validate.yml
```

## 适配器要求

- 每个文件一个 `defineAdapter({ id, name, kind, match, read(io) })`；
- `id` 必须与索引的 `id` 一致；
- `match` 必须与索引的 `match` 一致；
- `read(io)` 返回 `{ percent, charging }`，`percent` 为 0–100；
- 标明证据级别：`verified` / `community` 需要真实硬件，`experimental` 可以只有协议/测试向量：
  - `verified`：维护者验证；
  - `community`：社区实测，但未独立复核；
  - `experimental`：协议推断/测试向量，尚未确认；
- 不要访问声明 `match` 之外的设备，也不要写设置或固件。

## 安全

适配器是拥有 HID 读写权限的可执行 JavaScript。插件会校验 SHA-256、`id`/`match`
一致性，要求显式预览和确认，并且只写入用户适配器目录。这个仓库是策展的：
每个适配器在合并前都会审查。

不要提交：

- 访问声明 `match` 之外设备的代码；
- 使用网络、文件系统、进程或注册表访问的代码；
- 尝试修改固件或设备持久配置的代码；
- 混淆过的源码。

## 许可

MIT，见 [LICENSE](LICENSE)。每个适配器的版权归其作者所有。
