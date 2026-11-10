import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, renameSync, utimesSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { skillStamp } from '../lib/order.js'

function makeSkill(dir, name) {
  mkdirSync(dir)
  writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: 测试\n---\n`, 'utf8')
}

test('指纹跟随新增、改名、删除、内容修改而变化', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-stamp-'))
  const roots = [{ source: 'user', dir: root }]
  try {
    makeSkill(join(root, '01-alpha'), '01-alpha')
    const a = skillStamp(roots)
    assert.ok(a.length > 0)

    assert.equal(skillStamp(roots), a, '同一状态两次取指纹必须一致')

    makeSkill(join(root, '02-beta'), '02-beta')
    const b = skillStamp(roots)
    assert.notEqual(b, a, '新增技能后指纹必须变化')

    renameSync(join(root, '02-beta'), join(root, '02-gamma'))
    const c = skillStamp(roots)
    assert.notEqual(c, b, '目录改名后指纹必须变化')

    const md = join(root, '01-alpha', 'SKILL.md')
    utimesSync(md, new Date(), new Date(Date.now() + 5000))
    const d = skillStamp(roots)
    assert.notEqual(d, c, 'SKILL.md 修改时间变化后指纹必须变化')

    rmSync(join(root, '02-gamma'), { recursive: true, force: true })
    const e = skillStamp(roots)
    assert.notEqual(e, d, '删除技能后指纹必须变化')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('目录不存在或没有 SKILL.md 时指纹为空串', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-stamp-empty-'))
  try {
    mkdirSync(join(root, 'no-skill-md'))
    assert.equal(skillStamp([{ source: 'user', dir: root }]), '')
    assert.equal(skillStamp([{ source: 'user', dir: join(root, 'missing') }]), '')
    assert.equal(skillStamp([]), '')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
