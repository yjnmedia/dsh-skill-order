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

test('有 hmr 时必须包在 runExclusive 里调 reload，否则宿主直接抛错', () => {
  let wrapped = 0
  let reloaded = 0
  const ctx = {
    get(name) {
      if (name === 'pluginManager') {
        return {
          reload() {
            reloaded += 1
            return Promise.resolve({ warnings: [] })
          },
        }
      }
      if (name === 'hmr') {
        return {
          runExclusive(operation) {
            wrapped += 1
            return Promise.resolve(operation())
          },
        }
      }
      return undefined
    },
  }
  const state = schedulePluginReload(ctx, { timer: (fn) => fn() })
  assert.equal(state, 'pending')
  assert.equal(wrapped, 1, '必须经由 hmr.runExclusive')
  assert.equal(reloaded, 1, '里面要真的调一次 reload')
})
