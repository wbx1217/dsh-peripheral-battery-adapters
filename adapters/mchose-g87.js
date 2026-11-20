// MCHOSE G87（41E4:2001）—— 从 Rust 内置协议迁到会话式适配器。
//
// 20 字节帧 / SET_REPORT / 命令 0x4A；前 19 字节和 & 0xFF；应答 [5]=电量，
// [6] 高半字节=充电状态；接收器会先回显查询帧（[4]==0），必须跳过。
//
// 这是 Phase 5 之后 MCHOSE G87 的唯一实现（Rust 内置 provider 已移除）。

const ATTEMPTS = 2
const READ_WINDOW_MS = 800
const QUERY = '13 4A 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 5E'

function checksum(bytes) {
  let sum = 0
  for (let i = 0; i < 19; i++) sum = (sum + bytes[i]) & 0xff
  return sum
}

defineAdapter({
  id: 'mchose-g87',
  name: 'MCHOSE G87',
  kind: 'keyboard',
  transport: '2.4G HID',
  match: { vid: '41E4', pid: '2001', usagePage: 'FF02', inLen: 20, outLen: 20 },
  async read(io) {
    return io.withSession({ writable: true }, async (session) => {
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        try {
          await session.flush(20)
          await session.write(QUERY, { mode: 'setOut', timeoutMs: 500 })
        } catch (error) {
          if (attempt === ATTEMPTS - 1) throw error
          continue
        }

        const deadline = Date.now() + READ_WINDOW_MS
        while (Date.now() < deadline) {
          const result = await session.read({ timeoutMs: 150 })
          if (!result.report) continue
          const bytes = result.report.split(' ').map((token) => parseInt(token, 16))
          if (bytes.length < 20) continue
          if (bytes[0] !== 0x13 || bytes[1] !== 0x4a) continue
          // [4]==0 是查询回显；只有载荷长度 2 的帧才是真应答。
          if (bytes[2] !== 0x01 || bytes[3] !== 0 || bytes[4] !== 0x02) continue
          if (bytes[19] !== checksum(bytes)) continue
          const percent = bytes[5]
          if (percent > 100) continue
          return { percent, charging: bytes[6] >> 4 === 1 }
        }
      }
      throw new Error('设备无应答（键盘可能休眠）')
    })
  },
})
