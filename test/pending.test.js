import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_SETTINGS,
  pickPendingSkills,
  readSettings,
  renameKeys,
  settingsPath,
  skillKey,
  writeSettings,
} from '../lib/config.js'
import { adoptFreshSkills, clearPendingNew } from '../lib/index.js'
import { listSkills } from '../lib/order.js'

function tempHome() {
  return mkdtempSync(join(tmpdir(), 'dso-home-'))
}

function seedSkill(root, dirName, description) {
  const dir = join(root, dirName)
  mkdirSync(dir)
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${dirName}\ndescription: ${description}\n---\n\n正文\n`,
    'utf8',
  )
  return dir
}

test('配置默认带 pendingNew，写出后还能读回来', () => {
  const home = tempHome()
  try {
    assert.deepEqual(readSettings(home).pendingNew, [])
    writeSettings(home, { ...DEFAULT_SETTINGS, pendingNew: ['user:02-alpha', '', 3] })
    assert.deepEqual(readSettings(home).pendingNew, ['user:alpha'], '只留非空字符串，并去掉编号')
    assert.equal(existsSync(settingsPath(home)), true)
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('pickPendingSkills 只返回当前还存在的，已删的自动作废', () => {
  const skills = [
    { id: 'user:01-a', dirName: '01-a' },
    { id: 'user:02-b', dirName: '02-b' },
  ]
  const got = pickPendingSkills(skills, ['user:02-b', 'user:09-gone'])
  assert.deepEqual(got.map((s) => s.id), ['user:02-b'])
  assert.deepEqual(pickPendingSkills(skills, []), [])
})

test('自动收进来的新技能记进 pendingNew，重载不丢', async () => {
  const home = tempHome()
  const root = mkdtempSync(join(tmpdir(), 'dso-roots-'))
  const roots = [{ source: 'user', dir: root }]
  try {
    seedSkill(root, '01-alpha', '甲')
    // 先建快照，再放一个「新技能」进来
    writeSettings(home, { ...DEFAULT_SETTINGS, knownSkills: listSkills(roots).map((s) => skillKey(s)) })
    seedSkill(root, 'zzz-beta', '乙')

    const result = await adoptFreshSkills(null, { home, roots })
    assert.equal(result.fresh, 1)
    assert.equal(result.adopted.length, 1)

    const after = readSettings(home)
    assert.equal(after.pendingNew.length, 1, '新技能要记进待确认名单')
    assert.match(after.pendingNew[0], /^user:zzz-beta$/, '记的是词干身份，实际 ' + after.pendingNew[0])
    assert.equal(listSkills(roots).length, 2)
  } finally {
    rmSync(home, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('点应用后待确认名单清空', () => {
  const home = tempHome()
  try {
    writeSettings(home, { ...DEFAULT_SETTINGS, pendingNew: ['user:02-beta'] })
    clearPendingNew(home)
    assert.deepEqual(readSettings(home).pendingNew, [])
    // 已空时再清一次不报错
    clearPendingNew(home)
    assert.deepEqual(readSettings(home).pendingNew, [])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
