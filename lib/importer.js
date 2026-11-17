// 导入技能：从本地目录或 zip 包读技能，校验后写进指定的技能根。
//
// 安全边界（照 @linxin666/dsh-client-ui-skill-explorer 的做法，但比它多拷一层附属文件）：
// - 只读来源里一层 `<name>/SKILL.md`、`<name>.md`；目录来源再递归拷 sm/<name>/ 下的其它文件
// - 软链一律跳过，不跟随；
// - frontmatter 必须有 name（kebab-case）与 description，不合规的直接跳过；
// - 只往目标根下写，且目标同名目录已存在时跳过，绝不覆盖；
// - 单技能正文 ≤64KB、归档 ≤4MB、条目 ≤512、解压总量 ≤4MB。

import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { inflateRawSync } from 'node:zlib'

export const IMPORT_LIMITS = {
  archiveBytes: 4 * 1024 * 1024,
  entries: 512,
  skillBytes: 64 * 1024,
  totalBytes: 4 * 1024 * 1024,
}

export class ImportRequestError extends Error {}

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 读 frontmatter，只认 name / description 两行。 */
export function parseSkillMeta(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) return null
  const meta = {}
  let key = null
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line)
    if (kv) {
      key = kv[1]
      meta[key] = kv[2].trim().replace(/^["']|["']$/g, '')
      continue
    }
    if (key && /^\s+/.test(line)) meta[key] = `${meta[key]} ${line.trim()}`.trim()
  }
  return meta
}

/** 校验一份 SKILL.md：够不够格被模型加载。返回 {ok, reason, name} */
export function validateSkill(name, text, size) {
  if (!name || !NAME_RE.test(name)) return { ok: false, reason: `名字不合规（要小写字母、数字、连字符）：${name || '(空)'}` }
  if (size > IMPORT_LIMITS.skillBytes) return { ok: false, reason: `SKILL.md 超过 ${IMPORT_LIMITS.skillBytes} 字节` }
  const meta = parseSkillMeta(text)
  if (!meta) return { ok: false, reason: '缺 frontmatter（开头要有 --- 包起来的 name 与 description）' }
  if (!meta.name) return { ok: false, reason: 'frontmatter 里缺 name' }
  if (!NAME_RE.test(meta.name)) return { ok: false, reason: `frontmatter 的 name 不合规：${meta.name}` }
  if (!meta.description) return { ok: false, reason: 'frontmatter 里缺 description' }
  return { ok: true, name: meta.name }
}

/** 目录来源：一层 `<name>/SKILL.md` 或 `<name>.md`。 */
export function scanDirectory(from) {
  let info
  try {
    info = lstatSync(from)
  } catch {
    throw new ImportRequestError(`读不到这个路径：${from}`)
  }
  if (info.isSymbolicLink()) throw new ImportRequestError('来源是软链接，不导入')
  if (!info.isDirectory()) throw new ImportRequestError(`不是一个目录：${from}`)

  const out = []
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const full = join(from, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      const file = join(full, 'SKILL.md')
      if (!existsSync(file)) continue
      out.push({ name: entry.name, kind: 'dir', dir: full, files: collectFiles(full) })
      continue
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
      const text = readFileSync(full, 'utf8')
      const meta = parseSkillMeta(text)
      const name = meta?.name || basename(entry.name, extname(entry.name))
      out.push({ name, kind: 'file', file: full, text })
    }
  }
  return out
}

/** 递归列出一棵技能目录里的文件，跳过软链与隐藏项，并守住总量。 */
function collectFiles(root, budget = { bytes: 0 }) {
  const files = []
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        walk(full, prefix ? `${prefix}/${entry.name}` : entry.name)
        continue
      }
      if (!entry.isFile()) continue
      const buf = readFileSync(full)
      budget.bytes += buf.length
      if (budget.bytes > IMPORT_LIMITS.totalBytes) throw new ImportRequestError('导入内容超过 4MB 上限')
      files.push({ rel: prefix ? `${prefix}/${entry.name}` : entry.name, data: buf })
    }
  }
  walk(root, '')
  return files
}

const EOCD_SIGNATURE = 101010256
const CENTRAL_SIGNATURE = 33639248
const LOCAL_SIGNATURE = 67324752
const ZIP64_MARKER = 0xffffffff

function findEocd(buf) {
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIGNATURE) return i
  }
  return -1
}

/** 解 zip：只支持 stored 与 deflate，zip64/加密直接报错。 */
export function readZipEntries(buf) {
  if (buf.length > IMPORT_LIMITS.archiveBytes) throw new ImportRequestError(`zip 超过 ${IMPORT_LIMITS.archiveBytes} 字节`)
  const eocd = findEocd(buf)
  if (eocd < 0) throw new ImportRequestError('不是 zip 文件：找不到中央目录')
  const total = buf.readUInt16LE(eocd + 10)
  const dirSize = buf.readUInt32LE(eocd + 12)
  const dirOffset = buf.readUInt32LE(eocd + 16)
  if (total === 0xffff || dirOffset === ZIP64_MARKER || dirSize === ZIP64_MARKER) throw new ImportRequestError('不支持 zip64 格式')
  if (total > IMPORT_LIMITS.entries) throw new ImportRequestError(`zip 里条目超过 ${IMPORT_LIMITS.entries} 个`)
  const entries = []
  let offset = dirOffset
  let totalBytes = 0
  for (let i = 0; i < total; i += 1) {
    if (offset + 46 > buf.length || buf.readUInt32LE(offset) !== CENTRAL_SIGNATURE) throw new ImportRequestError('zip 中央目录损坏')
    const flags = buf.readUInt16LE(offset + 8)
    const method = buf.readUInt16LE(offset + 10)
    const compSize = buf.readUInt32LE(offset + 20)
    const rawSize = buf.readUInt32LE(offset + 24)
    const nameLen = buf.readUInt16LE(offset + 28)
    const extraLen = buf.readUInt16LE(offset + 30)
    const commentLen = buf.readUInt16LE(offset + 32)
    const localOffset = buf.readUInt32LE(offset + 42)
    const name = buf.subarray(offset + 46, offset + 46 + nameLen).toString('utf8')
    offset += 46 + nameLen + extraLen + commentLen
    if (flags & 0x1) throw new ImportRequestError('不支持加密的 zip')
    if (name.endsWith('/')) continue
    if (localOffset + 30 > buf.length || buf.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) throw new ImportRequestError('zip 条目损坏')
    const lNameLen = buf.readUInt16LE(localOffset + 26)
    const lExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + lNameLen + lExtraLen
    const raw = buf.subarray(dataStart, dataStart + compSize)
    let data
    if (method === 0) data = raw
    else if (method === 8) data = inflateRawSync(raw)
    else throw new ImportRequestError(`不支持的压缩方式：${method}`)
    totalBytes += data.length
    if (totalBytes > IMPORT_LIMITS.totalBytes) throw new ImportRequestError('解压后超过 4MB 上限')
    entries.push({ name: name.replace(/\\/g, '/'), data })
  }
  return entries
}

/** 从 zip 条目里挑出技能：`<name>/SKILL.md` 或 `<name>.md`，允许整体套一层目录。 */
export function collectFromEntries(entries) {
  const paths = entries.map((entry) => entry.name)
  const firstSeg = new Set(paths.map((p) => p.split('/')[0]))
  let prefix = ''
  if (firstSeg.size === 1 && paths.every((p) => p.includes('/'))) {
    const only = [...firstSeg][0]
    const hasRootFile = paths.some((p) => p === only)
    if (!hasRootFile) prefix = `${only}/`
  }
  const byName = new Map()
  for (const entry of entries) {
    if (!entry.name.startsWith(prefix)) continue
    const rel = entry.name.slice(prefix.length)
    if (!rel) continue
    const parts = rel.split('/')
    if (parts.length === 1) {
      const base = parts[0]
      if (extname(base).toLowerCase() !== '.md') continue
      const text = Buffer.isBuffer(entry.data) ? entry.data.toString('utf8') : String(entry.data)
      const meta = parseSkillMeta(text)
      const name = meta?.name || basename(base, extname(base))
      if (!byName.has(name)) byName.set(name, { name, kind: 'file', text, files: [] })
      continue
    }
    const dirName = parts[0]
    if (parts.length < 2) continue
    if (!byName.has(dirName)) byName.set(dirName, { name: dirName, kind: 'dir', files: [] })
    const bucket = byName.get(dirName)
    if (bucket.kind === 'dir') bucket.files.push({ rel: parts.slice(1).join('/'), data: entry.data })
  }
  return [...byName.values()]
}

function ensureSkillText(candidate) {
  if (candidate.kind === 'file') return { text: candidate.text, size: Buffer.byteLength(candidate.text, 'utf8') }
  const skillFile = candidate.files.find((file) => file.rel.toLowerCase() === 'skill.md')
  if (!skillFile) return null
  const text = Buffer.isBuffer(skillFile.data) ? skillFile.data.toString('utf8') : String(skillFile.data)
  return { text, size: skillFile.data.length }
}

/**
 * 执行一次导入。
 * @param {{from?:string, zip?:Buffer, targetRoot:string, io?:object}} request
 */
export function importSkills({ from, zip, targetRoot, io = {} }) {
  const write = io.writeFileSync || writeFileSync
  const mkdir = io.mkdirSync || mkdirSync
  const exists = io.existsSync || existsSync
  if (!targetRoot) throw new ImportRequestError('没有指定导入到哪个技能根')
  const candidates = zip ? collectFromEntries(readZipEntries(zip)) : scanDirectory(from)
  if (!candidates.length) throw new ImportRequestError('这个来源里没找到技能（要有 <名字>/SKILL.md 或 <名字>.md）')

  const imported = []
  const skipped = []
  for (const candidate of candidates) {
    const skillText = ensureSkillText(candidate)
    if (!skillText) {
      skipped.push({ name: candidate.name, reason: '没有 SKILL.md' })
      continue
    }
    const verdict = validateSkill(candidate.name, skillText.text, skillText.size)
    if (!verdict.ok) {
      skipped.push({ name: candidate.name, reason: verdict.reason })
      continue
    }
    const targetDir = join(targetRoot, verdict.name)
    if (exists(targetDir)) {
      skipped.push({ name: verdict.name, reason: '目标里已有同名技能，没覆盖' })
      continue
    }
    mkdir(targetDir, { recursive: true })
    const nested = candidate.kind === 'dir' ? candidate.files : [{ rel: 'SKILL.md', data: Buffer.from(skillText.text, 'utf8') }]
    if (candidate.kind === 'dir' && !nested.some((file) => file.rel.toLowerCase() === 'skill.md')) {
      nested.push({ rel: 'SKILL.md', data: Buffer.from(skillText.text, 'utf8') })
    }
    for (const file of nested) {
      const dest = join(targetDir, file.rel)
      mkdir(dirname(dest), { recursive: true })
      write(dest, file.data)
    }
    imported.push({ name: verdict.name, files: nested.length })
  }
  return { ok: true, root: targetRoot, imported, skipped }
}

export const __testing = { NAME_RE, IMPORT_LIMITS }
