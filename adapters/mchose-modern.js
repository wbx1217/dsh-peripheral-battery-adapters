defineAdapter({
  id: 'mchose-modern',
  name: 'MCHOSE K7 V2 / 现代鼠标',
  kind: 'mouse',
  transport: '2.4G · MCHOSE',
  showWhenMissing: false,
  match: {
    vid: '3837',
    pid: ['1014', '1016', '1018', '102C', '102D', '4028'],
    usagePage: 'FF01',
    outLen: 64,
    inLen: 64,
  },
  async read(io) {
    const request = new Array(64).fill(0)
    request[0] = 0x4d
    request[1] = 0x01
    request[2] = 0x01
    request[4] = 0x00
    request[5] = 0x09
    request[6] = 0x00
    request[7] = 0x00
    request[8] = xor(request, 2, 7)

    const result = await io.exchange({
      mode: 'setout',
      hex: hex(request),
      wait: 900,
      reads: 8,
      outLen: 64,
      inLen: 64,
    })

    for (const report of result.reports) {
      const bytes = bytesOf(report)
      if (bytes.length < 10 || bytes[0] !== 0x4d) continue
      if ((bytes[4] | (bytes[5] << 8)) !== 0x0900) continue

      const len = bytes[3]
      if (len < 14) continue
      if (8 + len >= bytes.length) continue
      if (bytes[8 + len] !== xor(bytes, 2, 7 + len)) continue
      if ((bytes[8] | (bytes[9] << 8)) !== 0x3837) continue
      if (bytes[18] === 0) continue

      const percent = bytes[20]
      if (percent < 0 || percent > 100) continue
      return {
        percent,
        charging: bytes[19] === 0x01,
        name: productName(io),
      }
    }

    throw new Error('设备无应答（鼠标可能休眠）')
  },
})

function xor(bytes, from, to) {
  let value = 0
  for (let index = from; index <= to && index < bytes.length; index++) value ^= bytes[index]
  return value
}

function bytesOf(report) {
  return String(report)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((value) => parseInt(value, 16))
}

function hex(bytes) {
  return bytes.map((value) => (value & 0xff).toString(16).padStart(2, '0')).join(' ')
}

function productName(io) {
  const product = String(io.device?.product || '').trim()
  if (!product) return undefined
  if (/usb composite device|wireless receiver|2\.4g wireless/i.test(product)) return undefined
  return product
}
