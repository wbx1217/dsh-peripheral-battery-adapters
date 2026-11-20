// Template only — this file is not indexed and never installed automatically.
// Copy it to adapters/<your-id>.js, then add an index.json entry.
defineAdapter({
  id: 'example-device',
  name: 'Example Device',
  kind: 'mouse',
  transport: '2.4G HID',
  match: { vid: 'FFFF', pid: '0001', usagePage: 'FF02' },
  async read(io) {
    const { reports } = await io.exchange({
      mode: 'setout',
      hex: '01 02 03 00',
      wait: 800,
      reads: 4,
      inLen: 16,
    })
    for (const report of reports) {
      const bytes = report.split(' ').map((token) => parseInt(token, 16))
      if (bytes[0] === 0x01 && bytes[2] <= 100) {
        return { percent: bytes[2], charging: bytes[3] === 1 }
      }
    }
    throw new Error('设备无应答')
  },
})
