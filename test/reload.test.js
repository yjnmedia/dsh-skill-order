import { test } from 'node:test'
import assert from 'node:assert/strict'
import { codeStamp, schedulePluginReload } from '../lib/index.js'

test('插件代码指纹是 12 位小写十六进制，同一时刻取值稳定', () => {
  assert.match(codeStamp(), /^[0-9a-f]{12}$/)
  assert.equal(codeStamp(), codeStamp())
})

test('宿主没挂 pluginManager 时返回 unavailable，不抛错', () => {
  assert.equal(schedulePluginReload({}), 'unavailable')
  assert.equal(schedulePluginReload(undefined), 'unavailable')
})

test('pluginManager 没有 reload 方法时同样是 unavailable', () => {
  assert.equal(schedulePluginReload({ get: () => ({}) }), 'unavailable')
})

test('能重载时返回 pending，且不在当前请求里立刻调 reload', () => {
  let called = 0
  let scheduled = null
  const ctx = {
    get: (key) => (key === 'pluginManager' ? { reload: () => (called += 1) } : undefined),
  }
  const result = schedulePluginReload(ctx, {
    delayMs: 5,
    timer: (fn) => {
      scheduled = fn
    },
  })
  assert.equal(result, 'pending')
  assert.equal(called, 0, '必须先让响应发出去，否则请求会被自己切断')
  scheduled()
  assert.equal(called, 1)
})

test('reload 抛错不往上冒', () => {
  const ctx = {
    get: () => ({
      reload: () => {
        throw new Error('boom')
      },
    }),
  }
  assert.doesNotThrow(() => schedulePluginReload(ctx, { timer: (fn) => fn() }))
})
