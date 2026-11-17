import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  collectFromEntries,
  importSkills,
  parseSkillMeta,
  readZipEntries,
  scanDirectory,
  validateSkill,
} from '../lib/importer.js'

const SKILL = `---
name: demo-skill
description: 演示用的技能
---

正文。
`

/** 造一个只有 stored 条目的 zip（不压缩，够测解析）。 */
function makeZip(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, text] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8')
    const data = Buffer.from(text, 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(0, 8)
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    local.writeUInt16LE(0, 28)
    const localBuf = Buffer.concat([local, nameBuf, data])
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 10)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(Buffer.concat([central, nameBuf]))
    locals.push(localBuf)
    offset += localBuf.length
  }
  const dir = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(centrals.length, 8)
  eocd.writeUInt16LE(centrals.length, 10)
  eocd.writeUInt32LE(dir.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, dir, eocd])
}

test('frontmatter 只认 name 与 description', () => {
  const meta = parseSkillMeta(SKILL)
  assert.equal(meta.name, 'demo-skill')
  assert.equal(meta.description, '演示用的技能')
  assert.equal(parseSkillMeta('没有头'), null)
})

test('校验：名字、frontmatter、大小', () => {
  assert.equal(validateSkill('demo-skill', SKILL, Buffer.byteLength(SKILL)).ok, true)
  assert.equal(validateSkill('Demo Skill', SKILL, 10).ok, false)
  assert.equal(validateSkill('demo-skill', '没有头', 10).ok, false)
  assert.equal(validateSkill('demo-skill', '---\ndescription: 缺 name\n---\n', 10).ok, false)
  assert.equal(validateSkill('demo-skill', SKILL, 999999).ok, false)
})

test('目录来源：一层 <名字>/SKILL.md 与 <名字>.md', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-imp-'))
  try {
    mkdirSync(join(root, 'pack', 'demo-skill'), { recursive: true })
    writeFileSync(join(root, 'pack', 'demo-skill', 'SKILL.md'), SKILL)
    writeFileSync(join(root, 'pack', 'demo-skill', 'note.md'), '附带的说明')
    mkdirSync(join(root, 'pack', 'no-skill'), { recursive: true })
    writeFileSync(join(root, 'pack', 'single.md'), SKILL.replace('demo-skill', 'single-skill'))
    const found = scanDirectory(join(root, 'pack'))
    assert.deepEqual(found.map((item) => item.name).sort(), ['demo-skill', 'single-skill'])
    const dirItem = found.find((item) => item.name === 'demo-skill')
    assert.equal(dirItem.kind, 'dir')
    assert.equal(dirItem.files.length, 2, '目录要连附属文件一起带上')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('导入：写进目标根，同名不覆盖', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-imp2-'))
  try {
    mkdirSync(join(root, 'from', 'demo-skill'), { recursive: true })
    writeFileSync(join(root, 'from', 'demo-skill', 'SKILL.md'), SKILL)
    writeFileSync(join(root, 'from', 'demo-skill', 'note.md'), '附带')
    const target = join(root, 'skills')
    const first = importSkills({ from: join(root, 'from'), targetRoot: target })
    assert.equal(first.imported.length, 1)
    assert.deepEqual(readdirSync(join(target, 'demo-skill')).sort(), ['SKILL.md', 'note.md'])
    assert.match(readFileSync(join(target, 'demo-skill', 'SKILL.md'), 'utf8'), /name: demo-skill/)
    const second = importSkills({ from: join(root, 'from'), targetRoot: target })
    assert.equal(second.imported.length, 0)
    assert.match(second.skipped[0].reason, /同名/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('zip 来源：解开后按 <名字>/SKILL.md 认技能', () => {
  const zip = makeZip({
    'pack/demo-skill/SKILL.md': SKILL,
    'pack/demo-skill/extra.md': '附带的',
    'pack/loose.md': SKILL.replace('demo-skill', 'loose-skill'),
  })
  const entries = readZipEntries(zip)
  assert.equal(entries.length, 3)
  const candidates = collectFromEntries(entries)
  assert.deepEqual(candidates.map((c) => c.name).sort(), ['demo-skill', 'loose-skill'])
  const root = mkdtempSync(join(tmpdir(), 'dso-imp3-'))
  try {
    const result = importSkills({ zip, targetRoot: root })
    assert.equal(result.imported.length, 2)
    assert.match(readFileSync(join(root, 'demo-skill', 'extra.md'), 'utf8'), /附带/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('坏 zip 与不支持的压缩方式要报清楚', () => {
  assert.throws(() => readZipEntries(Buffer.from('not a zip')), /不是 zip/)
  const zip = makeZip({ 'a.md': SKILL })
  const patched = Buffer.from(zip)
  const central = patched.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
  patched.writeUInt16LE(99, central + 10) // 把中央目录里的压缩方式改成 99
  assert.throws(() => readZipEntries(patched), /不支持的压缩方式/)
})
