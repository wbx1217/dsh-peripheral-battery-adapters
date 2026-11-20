const HEADER = 0xfe
const LOCAL_PEER = 0x10
const REMOTE_PEER = 0x11
const KIND_REQUEST = 0x02
const KIND_DATA = 0x03
const TLV_STATUS = 0x01
const FRAME_LEN = 65
const PAYLOAD_OFFSET = 10

let sequence = 0

function crc16(bytes) {
  let crc = 0xffff
  for (const byte of bytes) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc
}

function buildQuery(seq) {
  const frame = new Array(FRAME_LEN).fill(0)
  frame[0] = 0x00
  frame[1] = HEADER
  frame[2] = seq & 0xff
  frame[3] = LOCAL_PEER
  frame[4] = 0x00
  frame[5] = KIND_REQUEST
  frame[6] = 0x00
  frame[7] = 0x00
  frame[8] = 0x02
  frame[9] = 0x00
  frame[10] = TLV_STATUS
  frame[11] = 0x00
  const crc = crc16(frame.slice(1, 12))
  frame[12] = (crc >> 8) & 0xff
  frame[13] = crc & 0xff
  return frame.map((value) => value.toString(16).padStart(2, '0').toUpperCase()).join(' ')
}

function parse(bytes) {
  if (bytes.length < PAYLOAD_OFFSET + 2) return null
  if (bytes[0] !== 0x00 || bytes[1] !== HEADER) return null
  if (bytes[3] !== LOCAL_PEER && bytes[3] !== REMOTE_PEER) return null
  if (bytes[5] !== KIND_REQUEST && bytes[5] !== KIND_DATA) return null
  if (bytes[7] !== 0x00) return null

  const len = bytes[8] | (bytes[9] << 8)
  const end = PAYLOAD_OFFSET + len
  if (end + 2 > bytes.length) return null
  const expected = (bytes[end] << 8) | bytes[end + 1]
  if (crc16(bytes.slice(1, end)) !== expected) return null

  let cursor = PAYLOAD_OFFSET
  while (cursor + 2 <= end) {
    const kind = bytes[cursor]
    const size = bytes[cursor + 1]
    const start = cursor + 2
    const stop = start + size
    if (stop > end) return null
    if (kind === TLV_STATUS && size >= 1) {
      const percent = bytes[start]
      if (percent > 100) return null
      return { percent, charging: null }
    }
    cursor = stop
  }
  return null
}

defineAdapter({
  id: 'darkrim-shadow',
  name: 'DARKRIM SHADOW',
  kind: 'headset',
  transport: '2.4G · RCSP',
  match: { vid: '3654', pid: '6901', usagePage: 'FF02', inLen: 65, outLen: 65 },
  async read(io) {
    sequence = (sequence + 1) & 0xff
    return io.withSession({ writable: true }, async (session) => {
      await session.flush(20)
      await session.write(buildQuery(sequence), { mode: 'write', timeoutMs: 300 })
      const deadline = Date.now() + 900
      while (Date.now() < deadline) {
        const result = await session.read({ timeoutMs: 150 })
        if (!result.report) continue
        const bytes = result.report.split(' ').map((token) => parseInt(token, 16))
        const reading = parse(bytes)
        if (reading) return reading
      }
      throw new Error('设备无应答（耳机可能休眠）')
    })
  },
})
