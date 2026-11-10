import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listSkills, applyOrder, stemOf } from '../lib/order.js'
import { skillRoots } from '../lib/index.js'

// 模拟设置页「置顶」：把最后一条插到最前，其余顺延，再点应用。
test('把最后一条置顶后应用：它变成 01，其余按原顺序顺延', () => {
  const live = listSkills(skillRoots())
  const total = live.length
  assert.ok(total >= 28, '技能数量异常：' + total)

  const root = mkdtempSync(join(tmpdir(), 'dso-pin-'))
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
    const pinned = total - 1
    const order = [cloned[pinned].id]
      .concat(cloned.slice(0, pinned).map((s) => s.id))
      .concat(cloned.slice(pinned + 1).map((s) => s.id))
    assert.equal(order.length, total)

    const result = applyOrder(cloned, order)
    assert.equal(result.ok, true)
    assert.equal(result.renamed.length, total)

    const after = listSkills(roots)
    assert.equal(after.length, total)
    assert.equal(after[0].name, '01-' + stemOf(cloned[pinned].name))
    assert.equal(after[0].description, cloned[pinned].description)

    after.forEach((skill, index) => {
      const source = cloned.find((s) => s.id === order[index])
      const want = String(index + 1).padStart(2, '0') + '-' + stemOf(source.name)
      assert.equal(skill.name, want)
      assert.equal(skill.dirName, want)
    })

    // 置顶项之外的相对顺序不变
    const restNames = after.slice(1).map((s) => stemOf(s.name))
    const originalRest = cloned.filter((_, i) => i !== pinned).map((s) => stemOf(s.name))
    assert.deepEqual(restNames, originalRest)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
