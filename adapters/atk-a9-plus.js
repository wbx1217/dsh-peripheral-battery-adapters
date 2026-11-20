// ATK A9 Plus NearLink（373B:1115）电量适配器 —— v1.1 的第一个真实用例。
//
// 协议来源：Linux 主线 hid-kysona 驱动 + LKML 描述符 + atk-tool / libatk-rs 互证。
//   - 集合：Usage Page 0xFF02、Usage 0x02、Report ID 0x08、17 字节（含 ID）
//   - 帧和 ≡ 0x55 (mod 256)
//   - 电量查询：08 04 00×14 49
//   - 应答：08 04 .. .. .. len [6]=电量% [7]=充电/有线 [8..9]=电芯 mV（大端）
//
// 鼠标休眠时接收器不应答 —— 这是正常现象，按一下/移动鼠标再查。

defineAdapter({
  id: 'atk-a9-plus',
  name: 'ATK A9 Plus',
  kind: 'mouse',
  transport: '2.4G · 星闪',
  showWhenMissing: true, // 这台是你自己的设备：没插/没开时保留一行「未连接」
  match: { vid: '373B', pid: '1115', usagePage: 'FF02' },
  async read(io) {
    const result = await io.exchange({
      mode: 'write', // WriteFile；失败时宿主也可以改用 setout（SET_REPORT）
      hex: '08 04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 49',
      wait: 900,
      reads: 4,
      inLen: 17, // 同 dongle 还有 20 字节的 0x13 集合，必须挑 17 字节这个
      usagePage: 'FF02',
    })

    for (const report of result.reports) {
      const bytes = report.split(' ').map((token) => parseInt(token, 16))
      if (bytes.length < 10) continue
      if (bytes[0] !== 0x08 || bytes[1] !== 0x04) continue
      const percent = bytes[6]
      if (percent > 100) continue
      return { percent, charging: bytes[7] === 1 }
    }

    throw new Error('设备无应答（鼠标可能休眠）')
  },
})
