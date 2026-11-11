import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, dirname, basename } from 'node:path'

export const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const TEMP_PREFIX = 'zzzdso-tmp-'

export function stemOf(name) {
  const raw = String(name || '')
  const stripped = raw.replace(/^(\d+-)+/, '')
  return stripped || raw
}

export function padWidth(count) {
  if (!Number.isInteger(count) || count < 1) return 2
  return count <= 99 ? 2 : String(count).length
}

export function targetName(index1, count, stem) {
  if (!Number.isInteger(index1) || index1 < 1) throw new Error(`序号无效: ${index1}`)
  if (!stem || !NAME_RE.test(stem)) throw new Error(`词干不合法: ${stem}`)
  const name = `${String(index1).padStart(padWidth(count), '0')}-${stem}`
  if (!NAME_RE.test(name)) throw new Error(`目标名不合法: ${name}`)
  return name
}

export function parseFrontmatter(text) {
  const src = String(text || '')
  const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return { name: '', description: '' }
  let name = ''
  let description = ''
  for (const line of match[1].split(/\r?\n/)) {
    const nameMatch = /^name:\s*(.*)$/.exec(line)
    if (nameMatch) {
      name = unquote(nameMatch[1].trim())
      continue
    }
    const descMatch = /^description:\s*(.*)$/.exec(line)
    if (descMatch) {
      description = unquote(descMatch[1].trim())
    }
  }
  return { name, description }
}

export function replaceNameLine(text, newName) {
  if (!NAME_RE.test(newName)) throw new Error(`目标名不合法: ${newName}`)
  const src = String(text || '')
  const match = src.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/)
  if (!match) throw new Error('SKILL.md 没有 frontmatter')
  const block = match[2]
  if (!/^name:\s*/m.test(block)) throw new Error('SKILL.md 没有 name 行')
  const nextBlock = block.replace(/^name:\s*.*$/m, `name: ${newName}`)
  return match[1] + nextBlock + match[3] + src.slice(match[0].length)
}

export function skillId(source, dirName) {
  return `${source}:${dirName}`
}

export function compareCodePoints(left, right) {
  const a = String(left || '')
  const b = String(right || '')
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function listSkills(roots, io = defaultIo) {
  const skills = []
  for (const root of roots || []) {
    if (!root?.dir || !io.existsSync(root.dir)) continue
    let entries
    try {
      entries = io.readdirSync(root.dir)
    } catch {
      continue
    }
    for (const dirName of entries) {
      if (!dirName || dirName.startsWith('.') || dirName.startsWith(TEMP_PREFIX)) continue
      const dir = join(root.dir, dirName)
      let st
      try {
        st = io.statSync(dir)
      } catch {
        continue
      }
      if (!st.isDirectory()) continue
      const md = join(dir, 'SKILL.md')
      if (!io.existsSync(md)) continue
      let text
      try {
        text = io.readFileSync(md, 'utf8')
      } catch {
        continue
      }
      const meta = parseFrontmatter(text)
      const name = meta.name || dirName
      skills.push({
        id: skillId(root.source, dirName),
        name,
        stem: stemOf(name),
        description: meta.description || '',
        source: root.source,
        dirName,
        dir,
        parent: root.dir,
      })
    }
  }
  skills.sort((left, right) => compareCodePoints(left.name, right.name) || compareCodePoints(left.id, right.id))
  return skills
}

// 技能目录指纹：目录名 + SKILL.md 的修改时间与大小。
// 新增、改名、删除、改内容都会让指纹变化；只读 stat，不读正文。
export function skillStamp(roots, io = defaultIo) {
  const parts = []
  for (const root of roots || []) {
    if (!root?.dir || !io.existsSync(root.dir)) continue
    let entries
    try {
      entries = io.readdirSync(root.dir)
    } catch {
      continue
    }
    for (const dirName of entries) {
      if (!dirName || dirName.startsWith('.') || dirName.startsWith(TEMP_PREFIX)) continue
      const md = join(root.dir, dirName, 'SKILL.md')
      try {
        const st = io.statSync(md)
        parts.push(`${root.source}\u0000${dirName}\u0000${st.mtimeMs}\u0000${st.size}`)
      } catch {
        continue
      }
    }
  }
  parts.sort()
  return parts.join('\u0001')
}

export function buildPlan(skills, orderedIds) {
  if (!Array.isArray(orderedIds)) throw new Error('order 必须是数组')
  if (!Array.isArray(skills)) throw new Error('skills 必须是数组')
  if (orderedIds.length !== skills.length) {
    throw new Error(`顺序条数是 ${orderedIds.length}，当前技能是 ${skills.length}，必须一次排完全部`)
  }
  if (new Set(orderedIds).size !== orderedIds.length) throw new Error('顺序里有重复项')
  const byId = new Map(skills.map((skill) => [skill.id, skill]))
  for (const id of orderedIds) {
    if (!byId.has(id)) throw new Error(`未知技能: ${id}`)
  }
  const count = orderedIds.length
  return orderedIds.map((id, index) => {
    const skill = byId.get(id)
    const newName = targetName(index + 1, count, stemOf(skill.name))
    return {
      id: skill.id,
      source: skill.source,
      fromDir: skill.dir,
      fromName: skill.name,
      dirName: skill.dirName,
      parent: skill.parent,
      newName,
      toDir: join(skill.parent, newName),
    }
  })
}

export function applyOrder(skills, orderedIds, io = defaultIo) {
  const plan = buildPlan(skills, orderedIds)
  const fromKey = new Set(plan.map((step) => normPath(step.fromDir)))
  for (const step of plan) {
    if (normPath(step.fromDir) === normPath(step.toDir)) continue
    if (io.existsSync(step.toDir) && !fromKey.has(normPath(step.toDir))) {
      throw new Error(`目标目录已存在: ${step.toDir}`)
    }
  }

  const journal = []
  const stamp = `${process.pid}-${Date.now().toString(36)}`
  try {
    plan.forEach((step, index) => {
      if (normPath(step.fromDir) === normPath(step.toDir)) {
        step.currentDir = step.fromDir
        return
      }
      const tempDir = join(step.parent, `${TEMP_PREFIX}${index}-${stamp}`)
      io.renameSync(step.fromDir, tempDir)
      journal.push({ kind: 'rename', from: step.fromDir, to: tempDir })
      step.currentDir = tempDir
    })

    for (const step of plan) {
      const md = join(step.currentDir, 'SKILL.md')
      const text = io.readFileSync(md, 'utf8')
      const next = replaceNameLine(text, step.newName)
      if (next !== text) {
        io.writeFileSync(md, next, 'utf8')
        journal.push({ kind: 'file', path: md, bak: text })
      }
    }

    for (const step of plan) {
      if (normPath(step.currentDir) === normPath(step.toDir)) continue
      if (io.existsSync(step.toDir) && normPath(step.currentDir) !== normPath(step.toDir)) {
        throw new Error(`目标目录已存在: ${step.toDir}`)
      }
      io.renameSync(step.currentDir, step.toDir)
      journal.push({ kind: 'rename', from: step.currentDir, to: step.toDir })
      step.currentDir = step.toDir
    }
  } catch (error) {
    rollback(journal, io)
    throw error
  }

  return {
    ok: true,
    renamed: plan
      .filter((step) => step.fromName !== step.newName || step.dirName !== step.newName)
      .map((step) => ({
        id: skillId(step.source, step.newName),
        from: step.fromName,
        to: step.newName,
        dir: step.toDir,
      })),
    skipped: plan.filter((step) => step.fromName === step.newName && step.dirName === step.newName).length,
  }
}

// 只改词干：前面的位置编号不动，其它技能一个不碰。
// stem 由用户输入，必须过宿主认可的名字规则，否则技能会直接加载失败。
export function renameSkill(skill, rawStem, io = defaultIo, peers = null) {
  if (!skill || !skill.dir || !skill.parent || !skill.dirName) throw new Error('技能信息不完整')
  const stem = String(rawStem === undefined || rawStem === null ? '' : rawStem).trim()
  if (!stem) throw new Error('名字不能为空')
  if (/^\d+-/.test(stem)) throw new Error('新名字不要带数字编号，编号由排序自动分配')
  if (!NAME_RE.test(stem)) throw new Error('只能用小写英文、数字和连字符，例如 report-todo')
  if (Array.isArray(peers)) {
    for (const peer of peers) {
      if (!peer || peer.id === skill.id) continue
      if (stemOf(peer.name) === stem) throw new Error(`已经有叫 ${stem} 的技能了（${peer.dirName}）`)
    }
  }

  const prefix = (String(skill.dirName).match(/^(\d+-)/) || [null, ''])[1]
  const nextDirName = prefix + stem
  const fromDir = skill.dir
  const toDir = join(skill.parent, nextDirName)

  if (normPath(fromDir) === normPath(toDir)) {
    return { ok: true, changed: false, from: skill.name, to: nextDirName, dir: fromDir }
  }
  if (io.existsSync(toDir)) throw new Error(`已经有叫 ${nextDirName} 的技能了，换个名字`)

  const md = join(fromDir, 'SKILL.md')
  const text = io.readFileSync(md, 'utf8')
  const next = replaceNameLine(text, nextDirName)
  const journal = []
  try {
    io.renameSync(fromDir, toDir)
    journal.push({ kind: 'rename', from: fromDir, to: toDir })
    if (next !== text) {
      const nextMd = join(toDir, 'SKILL.md')
      io.writeFileSync(nextMd, next, 'utf8')
      journal.push({ kind: 'file', path: nextMd, bak: text })
    }
  } catch (error) {
    rollback(journal, io)
    throw error
  }
  return { ok: true, changed: true, from: skill.name, to: nextDirName, dir: toDir }
}

// 简介长度上限：按显示宽度算，一个汉字占 2，合计不超过 40（即 20 个汉字）。
export const DESC_MAX = 40

export function charWidth(ch) {
  const code = ch.codePointAt(0)
  if (code >= 0x1100) {
    if (
      code <= 0x115f ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    ) {
      return 2
    }
  }
  return 1
}

export function descWidth(text) {
  let total = 0
  for (const ch of String(text || '')) total += charWidth(ch)
  return total
}

// 新技能落盘时的词干清洗：去掉记忆插件的前缀与哈希尾巴，剩下的当词干。
// 清不出能看的词（长度不足 3 或含非法字符）时退回 'skill'，由用户再改。
const HEX_SEGMENT = /^[0-9a-f]{6,}$/

export function normalizeStem(rawName) {
  let value = String(rawName || '')
    .toLowerCase()
    .trim()
  value = value.replace(/^(\d+-)+/, '')
  value = value.replace(/^mem-skill-/, '')
  value = value.replace(/[^a-z0-9]+/g, '-')
  const parts = value.split('-').filter(Boolean).filter((part) => !HEX_SEGMENT.test(part))
  value = parts.join('-').replace(/^-+|-+$/g, '')
  if (value.length < 3 || !NAME_RE.test(value)) return 'skill'
  return value
}

// 改简介：只替换 frontmatter 里单行的 description，保留原来的引号风格。
export function replaceDescriptionLine(text, newDescription) {
  const desc = String(newDescription === undefined || newDescription === null ? '' : newDescription).trim()
  if (!desc) throw new Error('简介不能为空')
  const src = String(text || '')
  const match = src.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/)
  if (!match) throw new Error('SKILL.md 没有 frontmatter')
  const block = match[2]
  const line = /^description:\s*(.*)$/m.exec(block)
  if (!line) throw new Error('SKILL.md 没有 description 行')
  const old = line[1].trim()
  if (old.startsWith('|') || old.startsWith('>')) throw new Error('简介是多行写法，先手动改成一行')
  const quoted = /^(['"]).*\1$/.test(old)
  const safe = /["'\\]/.test(desc) ? desc.replace(/["'\\]/g, ' ') : desc
  const value = quoted ? old[0] + safe + old[0] : safe
  const nextBlock = block.replace(/^description:\s*.*$/m, `description: ${value}`)
  return match[1] + nextBlock + match[3] + src.slice(match[0].length)
}

// 整名替换（含编号）：给刚冒出来的新技能补编号、换词干时用。
export function setSkillName(skill, nextName, io = defaultIo) {
  if (!skill || !skill.dir || !skill.parent) throw new Error('技能信息不完整')
  if (!NAME_RE.test(nextName)) throw new Error(`目标名不合法: ${nextName}`)
  const toDir = join(skill.parent, nextName)
  if (normPath(skill.dir) === normPath(toDir)) {
    return { ok: true, changed: false, from: skill.name, to: nextName, dir: skill.dir }
  }
  if (io.existsSync(toDir)) throw new Error(`目标目录已存在: ${toDir}`)

  const md = join(skill.dir, 'SKILL.md')
  const text = io.readFileSync(md, 'utf8')
  const next = replaceNameLine(text, nextName)
  const journal = []
  try {
    io.renameSync(skill.dir, toDir)
    journal.push({ kind: 'rename', from: skill.dir, to: toDir })
    if (next !== text) {
      const nextMd = join(toDir, 'SKILL.md')
      io.writeFileSync(nextMd, next, 'utf8')
      journal.push({ kind: 'file', path: nextMd, bak: text })
    }
  } catch (error) {
    rollback(journal, io)
    throw error
  }
  return { ok: true, changed: true, from: skill.name, to: nextName, dir: toDir }
}

// 当前编号的最大值，新技能接在它后面。
export function maxIndex(skills) {
  let max = 0
  for (const skill of skills || []) {
    const match = /^(\d+)-/.exec(String(skill?.name || ''))
    if (match) max = Math.max(max, Number(match[1]))
  }
  return max
}

// 词干撞车时加 -2、-3 后缀，保证名字唯一。
export function uniqueStem(base, taken) {
  const used = taken instanceof Set ? taken : new Set(taken || [])
  let stem = base
  let n = 2
  while (used.has(stem)) {
    stem = `${base}-${n}`
    n += 1
  }
  return stem
}

function rollback(journal, io) {
  for (let i = journal.length - 1; i >= 0; i -= 1) {
    const item = journal[i]
    try {
      if (item.kind === 'rename' && io.existsSync(item.to)) {
        io.renameSync(item.to, item.from)
      } else if (item.kind === 'file') {
        io.writeFileSync(item.path, item.bak, 'utf8')
      }
    } catch {
      // 继续把其余步骤尽量复原
    }
  }
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

function normPath(value) {
  return String(value || '').replace(/\\/g, '/').toLowerCase()
}

const defaultIo = {
  existsSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  renameSync,
}


