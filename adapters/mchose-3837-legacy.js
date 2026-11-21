defineAdapter({
  id: 'mchose-3837-legacy',
  name: 'MCHOSE 3837 鼠标',
  kind: 'mouse',
  transport: '2.4G · MCHOSE',
  showWhenMissing: false,
  match: {
    vid: '3837',
    pid: ['1001', '100A', '100B', '100C', '1012'],
    usagePage: 'FF01',
    usage: '0001',
    featureLen: 65,
  },
  async read(io) {
    const featureLen = Math.max(65, Number(io.device?.featureLen) || 65)
    const request = new Array(featureLen).fill(0xff)
    request[0] = 0x12
    request[1] = 0x06 ^ 0xff
    const expectedVids = [0x3837, 0x41e4]

    return io.withSession({}, async (session) => {
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt) await io.sleep(100)
        try {
          await session.setFeature(hex(request))
        } catch {
          continue
        }
        await io.sleep(120)

        let result
        try {
          result = await session.getFeature('12')
        } catch {
          continue
        }
        if (!result?.report) continue

        const bytes = bytesOf(result.report)
        if (bytes.length < 13) continue
        if (bytes[0] !== 0x12 || bytes[1] !== (0x06 ^ 0xff)) continue

        const payload = bytes.slice(2, 13).map((value) => value ^ 0xff)
        if (payload.every((value) => value === 0)) continue

        const field = payload[0] | (payload[1] << 8)
        if (!expectedVids.includes(field)) continue
        const percent = payload[9]
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) continue

        return {
          percent,
          charging: payload[10] !== 0,
          name: productName(io),
        }
      }

      throw new Error('设备无应答（鼠标可能休眠）')
    })
  },
})

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
