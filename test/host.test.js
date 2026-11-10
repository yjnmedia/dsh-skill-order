import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { apply, inject, name } from '../lib/index.js'

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
