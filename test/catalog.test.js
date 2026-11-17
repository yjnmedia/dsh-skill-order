import test from 'node:test'
import assert from 'node:assert/strict'
import { extrasOf, groupOfLocalSource, groupOfRegistrySource, groupSummary } from '../lib/catalog.js'

test('磁盘来源映射到分组', () => {
  assert.equal(groupOfLocalSource('user'), 'user')
  // 两个磁盘根合并成一张可排序清单（编号按全局位次）
  assert.equal(groupOfLocalSource('superpowers'), 'user')
  assert.equal(groupOfLocalSource(undefined), 'user')
})

test('注册表来源映射到分组', () => {
  assert.equal(groupOfRegistrySource('user-dsh'), 'user')
  assert.equal(groupOfRegistrySource('user-agents'), 'user')
  assert.equal(groupOfRegistrySource('custom'), 'user')
  assert.equal(groupOfRegistrySource('project-dsh'), 'user')
  assert.equal(groupOfRegistrySource('bundled'), 'bundled')
  assert.equal(groupOfRegistrySource('expert-library'), 'provider')
  assert.equal(groupOfRegistrySource(undefined), 'provider')
})

test('extras 只留磁盘扫不到的，并且不能排序', () => {
  const local = [{ name: '01-memory-distill', dirName: '01-memory-distill', source: 'user' }]
  const summary = [
    { name: '01-memory-distill', description: '本地这个', source: 'user-dsh' },
    { name: 'expert-ai-image', description: '插件提供的', source: 'expert-library' },
    { name: 'memory-distill', description: '去掉编号后同名，也算已登记', source: 'user-dsh' },
    { name: 'bundled-skill', description: '系统自带', source: 'bundled' },
    { name: 'zip-skill', description: '压缩包里的', source: 'custom' },
  ]
  const extras = extrasOf(summary, local)
  const names = extras.map((item) => item.name)
  assert.ok(!names.includes('01-memory-distill'))
  assert.ok(!names.includes('memory-distill'))
  assert.deepEqual(names, ['bundled-skill', 'expert-ai-image', 'zip-skill'])
  for (const item of extras) assert.equal(item.sortable, false)
  const byName = new Map(extras.map((item) => [item.name, item]))
  assert.equal(byName.get('expert-ai-image').group, 'provider')
  assert.equal(byName.get('bundled-skill').group, 'bundled')
  assert.equal(byName.get('zip-skill').group, 'user')
})

test('注册表重复项只算一次，空输入不炸', () => {
  const summary = [
    { name: 'expert-reader', source: 'expert-library' },
    { name: 'expert-reader', source: 'expert-library' },
  ]
  assert.equal(extrasOf(summary, []).length, 1)
  assert.deepEqual(extrasOf([], []), [])
  assert.deepEqual(extrasOf(undefined, undefined), [])
})

test('分组摘要按固定顺序给计数，空组不出现', () => {
  const local = [
    { source: 'user' },
    { source: 'user' },
    { source: 'superpowers' },
  ]
  const extras = [
    { group: 'provider' },
    { group: 'bundled' },
    { group: 'bundled' },
    { group: 'provider' },
  ]
  const groups = groupSummary(local, extras)
  assert.deepEqual(groups.map((g) => g.id), ['user', 'bundled', 'provider'])
  assert.deepEqual(groups.map((g) => g.count), [3, 2, 2])
  assert.equal(groups[0].sortable, true)
  assert.equal(groups[2].sortable, false)
  assert.deepEqual(groupSummary([], []), [])
})
