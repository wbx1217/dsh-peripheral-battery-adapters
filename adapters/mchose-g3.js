defineAdapter({
  id: 'mchose-g3',
  name: 'MCHOSE G3 V2',
  kind: 'mouse',
  transport: '2.4G · MCHOSE',
  showWhenMissing: false,
  match: {
    vid: '3837',
    pid: ['418C', '4245'],
    usagePage: 'FF01',
    usage: '0010',
    outLen: 65,
    inLen: 65,
  },
  async read(io) {
    const result = await io.exchange({
      mode: 'write',
      hex: '00 55 30 A5 0B 2E 01 01 01 00 00',
      wait: 1000,
      reads: 8,
      outLen: 65,
      inLen: 65,
    })

    for (const report of result.reports) {
      const bytes = bytesOf(report)
      const start = bytes[0] === 0x00 ? 1 : 0
      if (bytes.length < start + 10) continue
      if (bytes[start] !== 0xaa || bytes[start + 1] !== 0x30) continue
      const percent = bytes[start + 8]
      if (percent < 1 || percent > 100) continue
      return {
        percent,
        charging: bytes[start + 9] === 1,
        name: productName(io),
      }
    }

    throw new Error('设备无应答（鼠标可能休眠）')
  },
})

function bytesOf(report) {
  return String(report)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => parseInt(value, 16))
}

function productName(io) {
  const product = String(io.device?.product || '').trim()
  if (!product) return undefined
  if (/usb composite device|wireless receiver|2\.4g wireless/i.test(product)) return undefined
  return product
}
