import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  stemOf,
  padWidth,
  targetName,
  parseFrontmatter,
  replaceNameLine,
  listSkills,
  applyOrder,
} from '../lib/order.js'

test('stemOf 去掉全部前置数字段，避免 1-2-3 叠加', () => {
  assert.equal(stemOf('1-writing-skills'), 'writing-skills')
  assert.equal(stemOf('01-writing-skills'), 'writing-skills')
  assert.equal(stemOf('1-2-3-foo'), 'foo')
  assert.equal(stemOf('writing-skills'), 'writing-skills')
})

test('≤99 个用两位编号', () => {
  assert.equal(padWidth(1), 2)
  assert.equal(padWidth(42), 2)
  assert.equal(padWidth(99), 2)
  assert.equal(padWidth(100), 3)
  assert.equal(targetName(1, 42, 'code-review'), '01-code-review')
  assert.equal(targetName(42, 42, 'code-review'), '42-code-review')
})

test('replaceNameLine 只改 name 行，中文 description 原样保留', () => {
  const src = `---
name: 3-code-review
description: 审查一段改动，查它是否符合规范和需求
---

正文不改
`
  const next = replaceNameLine(src, '01-code-review')
  assert.match(next, /^name: 01-code-review$/m)
  assert.match(next, /description: 审查一段改动，查它是否符合规范和需求/)
  assert.match(next, /正文不改/)
  const parsed = parseFrontmatter(next)
  assert.equal(parsed.name, '01-code-review')
  assert.equal(parsed.description, '审查一段改动，查它是否符合规范和需求')
})

function writeSkill(dir, name, description) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(dir + '/SKILL.md', `---\nname: ${name}\ndescription: ${description}\n---\n\nbody\n`, 'utf8')
}

test('listSkills 只扫给定根目录，按 name 码点排序，跳过无 SKILL.md', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-list-'))
  try {
    writeSkill(join(root, 'user', '2-beta'), '2-beta', '乙')
    writeSkill(join(root, 'user', '1-alpha'), '1-alpha', '甲')
    mkdirSync(join(root, 'user', 'no-md'), { recursive: true })
    writeSkill(join(root, 'sp', '3-gamma'), '3-gamma', '丙')
    const skills = listSkills([
      { source: 'user', dir: join(root, 'user') },
      { source: 'superpowers', dir: join(root, 'sp') },
    ])
    assert.equal(skills.length, 3)
    assert.deepEqual(skills.map((s) => s.name), ['1-alpha', '2-beta', '3-gamma'])
    assert.equal(skills[0].source, 'user')
    assert.equal(skills[2].source, 'superpowers')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('两目录互换时先走临时名，目录与 name 同步，失败回滚', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-swap-'))
  const user = join(root, 'user')
  try {
    writeSkill(join(user, '01-alpha'), '01-alpha', '中文甲')
    writeSkill(join(user, '02-beta'), '02-beta', '中文乙')
    const skills = listSkills([{ source: 'user', dir: user }])
    const swapped = applyOrder(skills, ['user:02-beta', 'user:01-alpha'])
    assert.equal(swapped.ok, true)
    assert.equal(existsSync(join(user, '01-beta')), true)
    assert.equal(existsSync(join(user, '02-alpha')), true)
    assert.equal(existsSync(join(user, '01-alpha')), false)
    const a = readFileSync(join(user, '01-beta', 'SKILL.md'), 'utf8')
    const b = readFileSync(join(user, '02-alpha', 'SKILL.md'), 'utf8')
    assert.match(a, /^name: 01-beta$/m)
    assert.match(a, /中文乙/)
    assert.match(b, /^name: 02-alpha$/m)
    assert.match(b, /中文甲/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('应用中途失败时回滚到原目录和原文', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-rb-'))
  const user = join(root, 'user')
  try {
    writeSkill(join(user, '01-alpha'), '01-alpha', '中文甲')
    writeSkill(join(user, '02-beta'), '02-beta', '中文乙')
    const skills = listSkills([{ source: 'user', dir: user }])
    let renames = 0
    const io = {
      existsSync,
      readdirSync: () => [],
      statSync: () => ({ isDirectory: () => true }),
      readFileSync,
      writeFileSync,
      renameSync(from, to) {
        renames += 1
        if (renames === 4) throw new Error('boom')
        renameSync(from, to)
      },
    }
    assert.throws(() => applyOrder(skills, ['user:02-beta', 'user:01-alpha'], io), /boom/)
    assert.equal(existsSync(join(user, '01-alpha')), true)
    assert.equal(existsSync(join(user, '02-beta')), true)
    assert.match(readFileSync(join(user, '01-alpha', 'SKILL.md'), 'utf8'), /^name: 01-alpha$/m)
    assert.match(readFileSync(join(user, '02-beta', 'SKILL.md'), 'utf8'), /中文乙/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
