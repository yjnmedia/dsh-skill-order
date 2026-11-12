import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { applyOrder, listSkills } from '../lib/order.js'
import { normalizeKey, pickNewSkills, pickPendingSkills, renameKeys, skillKey } from '../lib/config.js'

const seed = (root, dirName, desc) => {
  const dir = join(root, dirName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${dirName}\ndescription: ${desc}\n---\n\n正文\n`,
    'utf8',
  )
}

test('身份只看词干，不看编号', () => {
  assert.equal(skillKey({ source: 'user', name: '07-to-questionnaire' }), 'user:to-questionnaire')
  assert.equal(skillKey({ source: 'superpowers', name: '12-run-plan' }), 'superpowers:run-plan')
})

test('旧配置里带编号的写法会被归一化', () => {
  assert.equal(normalizeKey('user:01-report-todo'), 'user:report-todo')
  assert.equal(normalizeKey('user:report-todo'), 'user:report-todo')
  assert.equal(normalizeKey('report-todo'), 'report-todo')
})

// 1.0.15 的 bug：身份用带编号的目录名，重排后全部对不上，
// 于是每次应用后都把全部技能当成新技能再排一遍。这条守住它不再发生。
test('重排改了编号，不能把技能当成新出现的', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-key-'))
  const roots = [{ source: 'user', dir: root }]
  try {
    seed(root, '01-alpha', '甲')
    seed(root, '02-beta', '乙')
    const before = listSkills(roots)
    const known = before.map((s) => skillKey(s))

    const order = [before[1].id, before[0].id]
    assert.equal(applyOrder(before, order).ok, true)

    const after = listSkills(roots)
    assert.deepEqual(
      after.map((s) => s.dirName),
      ['01-beta', '02-alpha'],
    )
    assert.deepEqual(pickNewSkills(after, known), [], '重排后不该有任何「新技能」')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('真新技能能被认出来，旧编号写法也认', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-key2-'))
  const roots = [{ source: 'user', dir: root }]
  try {
    seed(root, '01-alpha', '甲')
    const known = ['user:01-alpha']
    seed(root, '02-gamma', '丙')
    const fresh = pickNewSkills(listSkills(roots), known)
    assert.equal(fresh.length, 1)
    assert.equal(fresh[0].dirName, '02-gamma')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('改名后身份跟着换，下次检查不会变成新技能', () => {
  const settings = {
    autoPopup: true,
    autoPinNew: true,
    knownSkills: ['user:alpha', 'user:beta'],
    pendingNew: ['user:alpha'],
  }
  const next = renameKeys({ source: 'user', name: '01-alpha' }, '01-alpha-renamed', settings)
  assert.deepEqual(next.knownSkills, ['user:alpha-renamed', 'user:beta'])
  assert.deepEqual(next.pendingNew, ['user:alpha-renamed'])
})

test('待确认名单按词干匹配，编号变了也找得到', () => {
  const root = mkdtempSync(join(tmpdir(), 'dso-key3-'))
  const roots = [{ source: 'user', dir: root }]
  try {
    seed(root, '05-gamma', '丙')
    const pinned = pickPendingSkills(listSkills(roots), ['user:02-gamma'])
    assert.equal(pinned.length, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
