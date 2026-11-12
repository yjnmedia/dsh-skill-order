import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { adoptFreshSkills, rewriteDescription } from '../lib/index.js'
import { descWidth, listSkills, normalizeStem, replaceDescriptionLine } from '../lib/order.js'
import { DEFAULT_SETTINGS, pickNewSkills, readSettings, writeSettings } from '../lib/config.js'

function makeSkill(root, dirName, name, description) {
  const dir = join(root, dirName)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n正文\n`,
    'utf8',
  )
  return dir
}

function mockCtx(text) {
  return {
    llm: {
      listProviders: () => ['prov'],
      listModels: () => [{ id: 'model-a' }],
      stream: async function* stream() {
        yield { type: 'text-delta', text }
        yield { type: 'finish' }
      },
    },
    skills: { invalidateCache() {} },
    emit() {},
    get: () => undefined,
  }
}

test('新技能词干清洗：去记忆插件前缀与哈希尾巴', () => {
  assert.equal(normalizeStem('mem-skill-t-5da4b451-b11bda4900e6'), 'skill', '清不出词就退回 skill')
  assert.equal(normalizeStem('mem-skill-dev-eb06f22561ec'), 'dev')
  assert.equal(normalizeStem('mem-skill-android-ui-f06b2ff90a21'), 'android-ui')
  assert.equal(normalizeStem('42-test-driven-development'), 'test-driven-development')
  assert.equal(normalizeStem('Hello World'), 'hello-world')
  assert.equal(normalizeStem(''), 'skill')
})

test('改简介只替换 description 一行，保留引号风格', () => {
  const quoted = '---\nname: 01-x\ndescription: "老简介"\n---\n\n正文\n'
  const out = replaceDescriptionLine(quoted, '新简介')
  assert.match(out, /^description: "新简介"$/m)
  assert.match(out, /name: 01-x/)
  assert.match(out, /正文/)

  const plain = '---\nname: 01-x\ndescription: 老简介\n---\n\n'
  assert.match(replaceDescriptionLine(plain, '新简介'), /^description: 新简介$/m)
  assert.throws(() => replaceDescriptionLine(plain, '  '), /不能为空/)
})

test('显示宽度：汉字算 2', () => {
  assert.equal(descWidth('abc'), 3)
  assert.equal(descWidth('中文'), 4)
  assert.equal(descWidth('中文 ab'), 7)
})

test('开关与快照：缺文件用默认值，写回再读一致', () => {
  const home = mkdtempSync(join(tmpdir(), 'dso-cfg-'))
  try {
    assert.deepEqual(readSettings(home), DEFAULT_SETTINGS)
    assert.equal(existsSync(join(home, 'dsh-skill-order.json')), false, '只读不该建文件')

    const written = writeSettings(home, { autoPopup: false, autoPinNew: true, knownSkills: ['a:1'] })
    assert.equal(written.autoPopup, false)
    const back = readSettings(home)
    assert.equal(back.autoPopup, false)
    assert.deepEqual(back.knownSkills, ['a:1'])
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('第一次运行只记快照，不把已有技能当新技能', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dso-home-'))
  const root = mkdtempSync(join(tmpdir(), 'dso-skills-'))
  try {
    makeSkill(root, '01-alpha', '01-alpha', '第一个')
    const roots = [{ source: 'user', dir: root }]
    const result = await adoptFreshSkills(mockCtx('短'), { home, roots })
    assert.equal(result.fresh, 0)
    assert.deepEqual(readSettings(home).knownSkills, ['user:alpha'], '身份是词干，不带编号')
    assert.equal(existsSync(join(root, '01-alpha')), true, '不该动已有技能')
  } finally {
    rmSync(home, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('新技能自动补编号、清词干、改写超长简介', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dso-home-'))
  const root = mkdtempSync(join(tmpdir(), 'dso-skills-'))
  try {
    makeSkill(root, '01-alpha', '01-alpha', '第一个')
    makeSkill(root, 'mem-skill-dev-eb06f22561ec', 'mem-skill-dev-eb06f22561ec', '这是一个特别特别长的简介，明显超过了二十个汉字的上限，需要模型来改写它')
    writeSettings(home, { ...DEFAULT_SETTINGS, knownSkills: ['user:01-alpha'] })

    const roots = [{ source: 'user', dir: root }]
    const result = await adoptFreshSkills(mockCtx('一句话说明'), { home, roots })

    assert.equal(result.fresh, 1)
    assert.deepEqual(result.adopted, [{ from: 'mem-skill-dev-eb06f22561ec', to: '02-dev', renamed: true }])
    assert.equal(existsSync(join(root, '02-dev')), true, '目录应改成 02-dev')
    assert.equal(existsSync(join(root, 'mem-skill-dev-eb06f22561ec')), false)

    const md = readFileSync(join(root, '02-dev', 'SKILL.md'), 'utf8')
    assert.match(md, /^name: 02-dev$/m)
    assert.match(md, /^description: 一句话说明$/m)
    assert.equal(result.rewritten.length, 1)

    const skills = listSkills(roots)
    assert.deepEqual(
      skills.map((s) => s.name),
      ['01-alpha', '02-dev'],
    )
    assert.deepEqual(readSettings(home).knownSkills.sort(), ['user:alpha', 'user:dev'])
  } finally {
    rmSync(home, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('模型给不出合格简介时保留原文并记失败，不改坏文件', async () => {
  const home = mkdtempSync(join(tmpdir(), 'dso-home-'))
  const root = mkdtempSync(join(tmpdir(), 'dso-skills-'))
  try {
    const long = '这是一个特别特别长的简介，明显超过了二十个汉字的上限，需要模型来改写它'
    makeSkill(root, '01-alpha', '01-alpha', '第一个')
    makeSkill(root, '02-beta', '02-beta', long)
    writeSettings(home, { ...DEFAULT_SETTINGS, knownSkills: ['user:01-alpha'] })

    const roots = [{ source: 'user', dir: root }]
    const result = await adoptFreshSkills(mockCtx('这条改写结果也被故意写得很长很长很长很长的'), { home, roots })

    assert.equal(result.rewritten.length, 0)
    assert.equal(result.failed.length, 1)
    assert.match(readFileSync(join(root, '02-beta', 'SKILL.md'), 'utf8'), new RegExp('^description: ' + long + '$', 'm'))
  } finally {
    rmSync(home, { recursive: true, force: true })
    rmSync(root, { recursive: true, force: true })
  }
})

test('没有模型服务时改写返回 null，不抛错', async () => {
  assert.equal(await rewriteDescription({}, '很长的简介'), null)
  assert.equal(await rewriteDescription({ llm: { listProviders: () => [] } }, '很长的简介'), null)
})

test('pickNewSkills 只挑没见过的', () => {
  const skills = [{ id: 'user:a' }, { id: 'user:b' }]
  assert.deepEqual(pickNewSkills(skills, []), [], '没有快照时不把任何技能当新的')
  assert.deepEqual(pickNewSkills(skills, ['user:a']), [{ id: 'user:b' }])
  assert.deepEqual(pickNewSkills(skills, ['user:a', 'user:b']), [])
})
