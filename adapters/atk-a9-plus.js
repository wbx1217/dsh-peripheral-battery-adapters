defineAdapter({
  id: 'atk-a9-plus',
  name: 'ATK A9 Plus',
  kind: 'mouse',
  transport: '2.4G · 星闪',
  showWhenMissing: true,
  match: { vid: '373B', pid: '1115', usagePage: 'FF02' },
  async read(io) {
    const result = await io.exchange({
      mode: 'write',
      hex: '08 04 00 00 00 00 00 00 00 00 00 00 00 00 00 00 49',
      wait: 900,
      reads: 4,
      inLen: 17,
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
