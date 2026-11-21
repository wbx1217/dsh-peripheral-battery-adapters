import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadAdapter(name) {
  let adapter = null
  const sandbox = { defineAdapter: (defined) => { adapter = defined } }
  vm.runInNewContext(readFileSync(path.join(ROOT, 'adapters', `${name}.js`), 'utf8'), sandbox)
  assert.ok(adapter, `${name} did not call defineAdapter`)
  return adapter
}

function hex(bytes) {
  return bytes.map((value) => (value & 0xff).toString(16).padStart(2, '0')).join(' ')
}

function oldReply({ vid = 0x5253, percent = 77, charging = 0, asleep = false } = {}) {
  const bytes = new Array(65).fill(0)
  bytes[0] = 0x12
  bytes[1] = 0x06 ^ 0xff
  const payload = new Array(11).fill(0)
  if (!asleep) {
    payload[0] = vid & 0xff
    payload[1] = (vid >> 8) & 0xff
    payload[8] = 9
    payload[9] = percent
    payload[10] = charging
  }
  for (let index = 0; index < 11; index++) bytes[2 + index] = payload[index] ^ 0xff
  return hex(bytes)
}

function modernReply({ link = 2, charging = 0, percent = 29, len = 16 } = {}) {
  const bytes = new Array(64).fill(0)
  bytes[0] = 0x4d
  bytes[1] = 0x01
  bytes[2] = 0x01
  bytes[3] = len
  bytes[5] = 0x09
  if (len >= 14) {
    bytes[8] = 0x37
    bytes[9] = 0x38
    bytes[18] = link
    bytes[19] = charging
    bytes[20] = percent
    bytes[24] = 0
    for (let index = 2; index <= 7 + len; index++) bytes[8 + len] ^= bytes[index]
  } else {
    bytes[8] = 0xff
  }
  return hex(bytes)
}

function g3Reply({ percent = 88, charging = 1, leadingId = true } = {}) {
  const offset = leadingId ? 1 : 0
  const bytes = new Array(65).fill(0)
  bytes[offset] = 0xaa
  bytes[offset + 1] = 0x30
  bytes[offset + 8] = percent
  bytes[offset + 9] = charging
  return hex(bytes)
}

function k87Reply({ charging = 1, percent = 88 } = {}) {
  const bytes = new Array(64).fill(0)
  bytes[0] = 0x4d
  bytes[1] = 0x01
  bytes[2] = 0x01
  bytes[3] = 20
  bytes[5] = 0x09
  bytes[8] = 0x37
  bytes[9] = 0x38
  bytes[10] = 0x23
  bytes[11] = 0x20
  bytes[18] = 2
  bytes[19] = charging
  bytes[20] = percent
  for (let index = 2; index <= 27; index++) bytes[28] ^= bytes[index]
  return hex(bytes)
}

test('mchose-5253 parses the 0x12 status report', async () => {
  const adapter = loadAdapter('mchose-5253')
  const io = {
    device: { vid: '5253', pid: '1020', featureLen: 65, product: 'MCHOSE L7 Ultra' },
    sleep: async () => {},
    withSession: async (_options, fn) =>
      fn({
        setFeature: async () => {},
        getFeature: async () => ({ report: oldReply({ percent: 77, charging: 0 }) }),
      }),
  }
  const result = await adapter.read(io)
  assert.equal(result.percent, 77)
  assert.equal(result.charging, false)
  assert.equal(result.name, 'MCHOSE L7 Ultra')
})

test('mchose-3837-legacy accepts the 3837 dongle VID field and charging bit', async () => {
  const adapter = loadAdapter('mchose-3837-legacy')
  const io = {
    device: { vid: '3837', pid: '100C', featureLen: 65, product: 'MCHOSE A5 V2 Ultra' },
    sleep: async () => {},
    withSession: async (_options, fn) =>
      fn({
        setFeature: async () => {},
        getFeature: async () => ({ report: oldReply({ vid: 0x41e4, percent: 64, charging: 1 }) }),
      }),
  }
  const result = await adapter.read(io)
  assert.equal(result.percent, 64)
  assert.equal(result.charging, true)
})

test('mchose-5253 treats an all-zero echo as asleep', async () => {
  const adapter = loadAdapter('mchose-5253')
  const io = {
    device: { vid: '5253', pid: '1020', featureLen: 65, product: 'MCHOSE L7 Ultra' },
    sleep: async () => {},
    withSession: async (_options, fn) =>
      fn({
        setFeature: async () => {},
        getFeature: async () => ({ report: oldReply({ asleep: true }) }),
      }),
  }
  await assert.rejects(() => adapter.read(io), /休眠/)
})

test('mchose-modern parses a device-info reply', async () => {
  const adapter = loadAdapter('mchose-modern')
  const io = {
    device: { vid: '3837', pid: '1014', product: 'MCHOSE K7 V2 Ultra+' },
    exchange: async () => ({ reports: [modernReply({ percent: 29 })] }),
  }
  const result = await adapter.read(io)
  assert.equal(result.percent, 29)
  assert.equal(result.charging, false)
  assert.equal(result.name, 'MCHOSE K7 V2 Ultra+')
})

test('mchose-modern marks not-linked as asleep and rejects a bad checksum', async () => {
  const adapter = loadAdapter('mchose-modern')
  const notLinked = {
    device: { vid: '3837', pid: '1014', product: 'MCHOSE K7 V2 Ultra+' },
    exchange: async () => ({ reports: [modernReply({ len: 1 })] }),
  }
  await assert.rejects(() => adapter.read(notLinked), /休眠/)

  const bad = modernReply({ percent: 50 })
  const bytes = bad.split(' ')
  bytes[24] = '00'
  const badChecksum = {
    device: { vid: '3837', pid: '1014', product: 'MCHOSE K7 V2 Ultra+' },
    exchange: async () => ({ reports: [bytes.join(' ')] }),
  }
  await assert.rejects(() => adapter.read(badChecksum), /休眠/)
})

test('mchose-g3 handles both leading report id and stripped replies', async () => {
  const adapter = loadAdapter('mchose-g3')
  for (const leadingId of [true, false]) {
    const io = {
      device: { vid: '3837', pid: '4245', product: 'MCHOSE G3 V2' },
      exchange: async () => ({ reports: [g3Reply({ percent: 88, charging: 1, leadingId })] }),
    }
    const result = await adapter.read(io)
    assert.equal(result.percent, 88)
    assert.equal(result.charging, true)
  }
})

test('mchose-k87 parses the 20-byte keyboard info', async () => {
  const adapter = loadAdapter('mchose-k87')
  const io = {
    device: { vid: '3837', pid: '1015', product: 'MCHOSE K87 V3 2.4G' },
    exchange: async () => ({ reports: [k87Reply({ percent: 98, charging: 1 })] }),
  }
  const result = await adapter.read(io)
  assert.equal(result.percent, 98)
  assert.equal(result.charging, true)
  assert.equal(result.name, 'MCHOSE K87 V3')
})
