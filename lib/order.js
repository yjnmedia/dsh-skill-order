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


