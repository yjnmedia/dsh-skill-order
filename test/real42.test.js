import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listSkills, applyOrder, stemOf } from '../lib/order.js'
import { skillRoots } from '../lib/index.js'

const NAME_RE = /^[0-9]{2,}-[a-z0-9]+(?:-[a-z0-9]+)*$/

test('真实技能在副本上倒序改名后目录与 name 同步，中文 description 不丢', () => {
  const live = listSkills(skillRoots())
  const userCount = live.filter((s) => s.source === 'user').length
  const spCount = live.filter((s) => s.source === 'superpowers').length
  assert.ok(userCount >= 27, '用户技能至少 27 个，实际 ' + userCount)
  assert.equal(spCount, 15)
  assert.equal(live.length, userCount + spCount)
  const total = live.length

  const root = mkdtempSync(join(tmpdir(), 'dso-real-'))
  const user = join(root, 'user')
  const sp = join(root, 'sp')
  mkdirSync(user)
  mkdirSync(sp)
  const roots = [
    { source: 'user', dir: user },
    { source: 'superpowers', dir: sp },
  ]
  try {
    for (const skill of live) {
      const parent = skill.source === 'superpowers' ? sp : user
      const dir = join(parent, skill.dirName)
      mkdirSync(dir)
      writeFileSync(join(dir, 'SKILL.md'), readFileSync(join(skill.dir, 'SKILL.md'), 'utf8'), 'utf8')
    }
    const cloned = listSkills(roots)
    assert.equal(cloned.length, total)

    const reversed = cloned.slice().reverse().map((s) => s.id)
    const result = applyOrder(cloned, reversed)
    assert.equal(result.ok, true)
    // 倒序时正中间那条位置没变、名字本来就对，不会改名，其余都要改
    assert.ok(
      result.renamed.length >= total - 1,
      '应改 ' + (total - 1) + ' 项以上，实际 ' + result.renamed.length,
    )

    const after = listSkills(roots)
    assert.equal(after.length, total)
    after.forEach((skill, index) => {
      const want = String(index + 1).padStart(2, '0') + '-' + stemOf(cloned[total - 1 - index].name)
      assert.equal(skill.name, want)
      assert.equal(skill.dirName, want)
      assert.equal(skill.description, cloned[total - 1 - index].description)
      assert.match(skill.name, NAME_RE, '改名后必须是宿主认可的名字格式：' + skill.name)
    })
    const sample = after.find((s) => s.description.includes('审查一段改动'))
    assert.ok(sample, '中文 description 应保留')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('没有数字前缀的技能（mem-skill-*）也能被编号，且名字仍合法', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-plain-'))
  const user = join(root, 'user')
  mkdirSync(user)
  const roots = [{ source: 'user', dir: user }]
  try {
    // 自造数据，不依赖真实目录当前是否还留着无前缀技能
    const seeds = ['mem-skill-t-aaaa1111bbbb', '2-regular', 'plain-name']
    for (const name of seeds) {
      const dir = join(user, name)
      mkdirSync(dir)
      writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: 中文说明\n---\n`, 'utf8')
    }
    const cloned = listSkills(roots)
    assert.equal(cloned.length, seeds.length)

    const result = applyOrder(cloned, cloned.slice().reverse().map((s) => s.id))
    assert.equal(result.ok, true)

    const after = listSkills(roots)
    assert.equal(after.length, seeds.length)
    after.forEach((skill) => {
      assert.ok(/^\d+-/.test(skill.name), '应被编上号：' + skill.name)
      assert.match(skill.name, NAME_RE, '名字必须合法：' + skill.name)
      assert.equal(skill.dirName, skill.name)
      assert.equal(skill.description, '中文说明')
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
