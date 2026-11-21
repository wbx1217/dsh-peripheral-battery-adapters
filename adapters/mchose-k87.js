let lastAskedAt = 0
let lastReading = null

defineAdapter({
  id: 'mchose-k87',
  name: 'MCHOSE K87 V3',
  kind: 'keyboard',
  transport: '2.4G · MCHOSE',
  showWhenMissing: false,
  match: {
    vid: '3837',
    pid: '1015',
    usagePage: 'FF80',
    outLen: 64,
    inLen: 64,
  },
  async read(io) {
    if (lastReading && Date.now() - lastAskedAt < 3 * 60 * 1000) return lastReading

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
      if (len < 20) continue
      if (8 + len >= bytes.length) continue
      if (bytes[8 + len] !== xor(bytes, 2, 7 + len)) continue
      if ((bytes[8] | (bytes[9] << 8)) !== 0x3837) continue
      if (bytes[10] !== 0x23 || bytes[11] !== 0x20) continue
      if (bytes[18] === 0) continue

      const percent = bytes[20]
      if (percent < 0 || percent > 100) continue
      lastAskedAt = Date.now()
      lastReading = {
        percent,
        charging: bytes[19] === 0x01,
        name: productName(io),
      }
      return lastReading
    }

    throw new Error('设备无应答（键盘可能休眠）')
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
  return product.replace(/\s+2\.4G$/i, '')
}
