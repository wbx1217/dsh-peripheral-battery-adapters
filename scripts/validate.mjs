import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []
const fail = (message) => errors.push(message)

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

function hex(value) {
  return String(value).toUpperCase()
}

function list(value) {
  return (Array.isArray(value) ? value : [value])
    .filter((item) => item !== undefined && item !== null && item !== '')
    .map(hex)
}

function canonMatch(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('match 缺失')
  if (raw.vid === undefined || raw.vid === null || raw.vid === '') throw new Error('match.vid 不能为空')
  const result = { vids: list(raw.vid), pids: raw.pid === undefined ? [] : list(raw.pid) }
  if (raw.usagePage) result.usagePage = hex(raw.usagePage)
  if (raw.usage) result.usage = hex(raw.usage)
  for (const key of ['inLen', 'outLen', 'featureLen']) {
    if (raw[key] !== undefined) result[key] = Number(raw[key])
  }
  return result
}

const index = JSON.parse(readFileSync(path.join(root, 'index.json'), 'utf8'))
if (index.version !== 1) fail('index.version 必须是 1')
if (!Array.isArray(index.adapters)) fail('index.adapters 必须是数组')

const seen = new Set()
const usedFiles = new Set()
for (const [i, entry] of (index.adapters || []).entries()) {
  const label = `#${i} ${entry?.id || '(no id)'}`
  try {
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(String(entry.id || ''))) throw new Error('id 非法')
    if (seen.has(entry.id)) throw new Error('id 重复')
    seen.add(entry.id)
    if (entry.model !== undefined && (typeof entry.model !== 'string' || entry.model.length > 80)) {
      throw new Error('model 非法')
    }
    if (!/^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.js$/.test(String(entry.file || ''))) {
      throw new Error('file 非法')
    }
    if (entry.file.split('/').includes('..')) throw new Error('file 不能包含 ..')
    if (!/^[a-f0-9]{64}$/.test(String(entry.sha256 || ''))) throw new Error('sha256 非法')

    const full = path.resolve(root, entry.file)
    if (!full.startsWith(`${root}${path.sep}`)) throw new Error('file 越界')
    if (!existsSync(full) || !statSync(full).isFile()) throw new Error(`文件不存在：${entry.file}`)
    const source = readFileSync(full, 'utf8')
    if (Buffer.byteLength(source, 'utf8') > 64 * 1024) throw new Error('源码超过 64 KiB')
    const actual = sha256(source)
    if (actual !== entry.sha256) throw new Error(`sha256 不匹配：实际 ${actual}`)

    let defined = null
    const sandbox = {
      defineAdapter: (adapter) => {
        defined = adapter
      },
      console: { log() {}, warn() {}, error() {} },
    }
    const context = vm.createContext(sandbox, {
      name: `validate:${entry.id}`,
      codeGeneration: { strings: false, wasm: false },
    })
    vm.runInContext(source, context, { filename: entry.file, timeout: 2_000 })
    if (!defined || typeof defined !== 'object') throw new Error('没有调用 defineAdapter(...)')
    if (typeof defined.read !== 'function') throw new Error('缺少 read(io)')
    if (String(defined.id) !== entry.id) throw new Error('源码 id 与索引不一致')
    if (JSON.stringify(canonMatch(defined.match)) !== JSON.stringify(canonMatch(entry.match))) {
      throw new Error('源码 match 与索引不一致')
    }
    usedFiles.add(entry.file)
  } catch (error) {
    fail(`${label}: ${error.message}`)
  }
}

const adaptersDir = path.join(root, 'adapters')
if (existsSync(adaptersDir)) {
  for (const name of readdirSync(adaptersDir)) {
    if (name.endsWith('.js') && !usedFiles.has(`adapters/${name}`)) {
      warnings.push(`adapters/${name} 没有被 index.json 引用`)
    }
  }
}

for (const warning of warnings) console.warn(`warning: ${warning}`)
if (errors.length > 0) {
  for (const error of errors) console.error(`error: ${error}`)
  process.exit(1)
}
console.log(`ok: ${index.adapters?.length || 0} adapter(s) validated`)
