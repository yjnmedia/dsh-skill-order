import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { apply, inject, name, refreshSkillCatalog } from '../lib/index.js'

function mockRes() {
  return {
    status: 0,
    headers: {},
    body: null,
    writeHead(status, headers) {
      this.status = status
      this.headers = headers
    },
    end(body) {
      this.body = body
    },
  }
}

test('apply 只向 webServer 注册 list / stamp / apply 三条路由', () => {
  const registered = []
  const ctx = {
    webServer: {
      register(route) {
        registered.push(route)
        return () => {}
      },
    },
    effect(fn) {
      return fn()
    },
    emit() {},
  }

  apply(ctx)

  assert.equal(name, 'dsh-skill-order')
  assert.deepEqual(inject, ['webServer'])
  assert.equal(registered.length, 3)
  assert.equal(registered[0].kind, 'exact')
  assert.equal(registered[0].path, '/api/dsh-skill-order/list')
  assert.equal(registered[1].path, '/api/dsh-skill-order/stamp')
  assert.equal(registered[2].path, '/api/dsh-skill-order/apply')

  const res = mockRes()
  registered[0].handler({ method: 'GET', socket: { remoteAddress: '127.0.0.1' } }, res)
  assert.equal(res.status, 200)
  const data = JSON.parse(Buffer.from(res.body).toString('utf8'))
  assert.equal(data.ok, true)
  assert.ok(data.count >= 40, '技能总数异常：' + data.count)
  assert.equal(data.skills.length, data.count)
  assert.match(String(data.stamp), /^[0-9a-f]{16}$/, 'list 必须带 16 位指纹')

  const stampRes = mockRes()
  registered[1].handler({ method: 'GET', socket: { remoteAddress: '127.0.0.1' } }, stampRes)
  assert.equal(stampRes.status, 200)
  const stampData = JSON.parse(Buffer.from(stampRes.body).toString('utf8'))
  assert.equal(stampData.ok, true)
  assert.equal(stampData.stamp, data.stamp, '两次取指纹必须一致')
  // apply 执行成功会写就绪日志，是「插件真的挂上」的可查证据
  assert.equal(existsSync(join(homedir(), '.dsh', 'dsh-skill-order-ready.log')), true)
})

test('改名后让宿主技能缓存失效，斜杠菜单不用重启', () => {
  let invalidated = 0
  const events = []
  const steps = refreshSkillCatalog({
    skills: {
      invalidateCache() {
        invalidated += 1
      },
    },
    emit(event) {
      events.push(event)
    },
  })
  assert.equal(invalidated, 1, '必须调用 skillService.invalidateCache()')
  assert.ok(events.includes('commands/change'), '还要通知命令面板')
  assert.deepEqual(steps, ['skills.invalidateCache', 'commands/change'])
})

test('宿主没挂 skills 服务时不抛错，只记 unavailable', () => {
  const events = []
  const steps = refreshSkillCatalog({
    emit(event) {
      events.push(event)
    },
  })
  assert.deepEqual(steps, ['skills.unavailable', 'commands/change'])
  assert.ok(events.includes('commands/change'))
})

test('ctx.skills 拿不到时退回 ctx.get("skills")', () => {
  let invalidated = 0
  const steps = refreshSkillCatalog({
    get(key) {
      return key === 'skills' ? { invalidateCache: () => (invalidated += 1) } : undefined
    },
    emit() {},
  })
  assert.equal(invalidated, 1)
  assert.equal(steps[0], 'skills.invalidateCache')
})

test('invalidateCache 抛错时不中断，改名结果照常返回', () => {
  const steps = refreshSkillCatalog({
    skills: {
      invalidateCache() {
        throw new Error('boom')
      },
    },
    emit() {},
  })
  assert.match(steps[0], /^skills\.invalidateCache failed: boom$/)
})
