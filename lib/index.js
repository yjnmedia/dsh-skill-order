import { homedir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { applyOrder, listSkills, renameSkill, skillStamp } from './order.js'

export const name = 'dsh-skill-order'
export const inject = ['webServer']

const API = '/api/dsh-skill-order'

export function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

export function skillRoots() {
  const home = dshHome()
  const profile = process.env.DSH_PROFILE || 'desktop'
  return [
    { source: 'user', dir: join(home, 'skills') },
    { source: 'superpowers', dir: join(home, 'profiles', profile, 'node_modules', 'superpowers-dsh', 'skills') },
  ]
}

function writeJson(res, status, data) {
  const body = Buffer.from(JSON.stringify(data), 'utf8')
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.length,
  })
  res.end(body)
}

function isLocal(req) {
  const ip = req.socket?.remoteAddress || req.connection?.remoteAddress || ''
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === ':ffff:127.0.0.1' ||
    ip === '::ffff:127.0.0.1' ||
    ip === ''
  )
}

function currentStamp() {
  return createHash('sha1').update(skillStamp(skillRoots())).digest('hex').slice(0, 16)
}

function handleList() {
  const skills = listSkills(skillRoots())
  return { ok: true, skills, count: skills.length, stamp: currentStamp() }
}

/**
 * 让宿主丢掉技能缓存并广播变更，斜杠菜单不用重启就能看到新名字。
 *
 * 宿主的 SkillService.invalidateCache()（@deepseek-ai/dsh-skill lib/index.js:376）
 * 会 revision+1、清 collectCache，再 emit('skills/change')，客户端据此重读磁盘。
 * ⚠️ 它不是公开 API（公开的只有 registerProvider），属宿主内部方法：
 *    宿主升级后改名或删掉，这里会自动跳过并退回 commands/change —— 只是斜杠菜单
 *    要等下次重启才变，不会影响改名本身。
 */
export function refreshSkillCatalog(ctx) {
  const steps = []
  let skills
  try {
    skills = ctx?.skills
  } catch {
    skills = undefined
  }
  if (!skills || typeof skills.invalidateCache !== 'function') {
    try {
      skills = typeof ctx?.get === 'function' ? ctx.get('skills') : undefined
    } catch {
      skills = undefined
    }
  }
  if (skills && typeof skills.invalidateCache === 'function') {
    try {
      skills.invalidateCache()
      steps.push('skills.invalidateCache')
    } catch (error) {
      steps.push('skills.invalidateCache failed: ' + String(error?.message || error))
    }
  } else {
    steps.push('skills.unavailable')
  }
  try {
    ctx?.emit?.('commands/change')
    steps.push('commands/change')
  } catch {
    /* 宿主没有该事件 */
  }

  // 界面的技能目录按会话缓存，只认 agent-preset/selected 这一个信号
  // （@deepseek-ai/dsh-client-ui-skill 的 client.js：ctx.remote.$on("agent-preset/selected", invalidate)）。
  // 不广播它，斜杠菜单会一直用启动时那份旧清单。
  try {
    const sessions = typeof ctx?.get === 'function' ? ctx.get('sessions') : undefined
    const list = sessions && typeof sessions.list === 'function' ? sessions.list() : []
    let notified = 0
    for (const session of list) {
      const id = session && (session.id ?? session.header?.id)
      const preset =
        session && session.header && typeof session.header.agentPreset === 'string'
          ? session.header.agentPreset
          : undefined
      if (id == null || !preset || typeof ctx?.emit !== 'function') continue
      ctx.emit('agent-preset/selected', id, preset)
      notified += 1
    }
    steps.push('agent-preset/selected x' + notified)
  } catch (error) {
    steps.push('agent-preset/selected failed: ' + String(error?.message || error))
  }

  return steps
}

export const WATCH_EVERY_MS = 2000

/**
 * 后台盯着技能目录：一有变化就让宿主丢掉技能缓存，斜杠菜单不用重启。
 *
 * 这是为了补上「别的工具改了技能却不通知宿主」的缺口 —— 例如技能中心
 * @linxin666/dsh-client-ui-skill-explorer 读写同一批目录，全包没有任何
 * emit / invalidateCache。它改完，这里替它把宿主唤醒。
 *
 * 只通知宿主：不重拉我们的列表、不改用户正在排的顺序。
 */
export function createSkillWatcher(ctx, options = {}) {
  const everyMs = options.everyMs ?? WATCH_EVERY_MS
  const stampOf = options.stampOf ?? currentStamp
  const refresh = options.refresh ?? (() => refreshSkillCatalog(ctx))
  let last = ''
  let timer = null

  const tick = () => {
    let stamp
    try {
      stamp = stampOf()
    } catch {
      // 目录暂时读不到（正在被删/建）不当作变化，等下一轮
      return false
    }
    if (last === '') {
      last = stamp
      return false
    }
    if (stamp === last) return false
    last = stamp
    try {
      refresh()
    } catch {
      /* 宿主没挂上技能服务也不影响后续轮询 */
    }
    return true
  }

  return {
    tick,
    start() {
      if (timer) return
      tick()
      timer = setInterval(tick, everyMs)
      if (typeof timer.unref === 'function') timer.unref()
    },
    stop() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    },
  }
}

function handleApply(body, ctx) {
  const order = body?.order
  const skills = listSkills(skillRoots())
  const result = applyOrder(skills, order)
  result.refresh = refreshSkillCatalog(ctx)
  return result
}

function handleRename(body, ctx) {
  const source = body?.source
  const dirName = body?.dirName
  const skills = listSkills(skillRoots())
  const target = skills.find((skill) => skill.source === source && skill.dirName === dirName)
  if (!target) throw new Error('找不到这个技能，可能刚被删掉或改过名，点「刷新」再看看')
  const result = renameSkill(target, body?.stem, undefined, skills)
  result.refresh = refreshSkillCatalog(ctx)
  return result
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8') || '{}'
        resolve(JSON.parse(text))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function stampReady() {
  if (process.env.NODE_TEST_CONTEXT) return
  try {
    writeFileSync(
      join(dshHome(), 'dsh-skill-order-ready.log'),
      `${new Date().toISOString()} pid=${process.pid} profile=${process.env.DSH_PROFILE || ''}\n`,
      'utf8',
    )
  } catch {
    /* ignore */
  }
}

export function apply(ctx) {
  const routes = [
    {
      kind: 'exact',
      path: `${API}/list`,
      handler: (req, res) => {
        if (req.method !== 'GET') return writeJson(res, 405, { ok: false, error: '只接受 GET' })
        if (!isLocal(req)) return writeJson(res, 403, { ok: false, error: '只允许本机访问' })
        try {
          writeJson(res, 200, handleList())
        } catch (error) {
          writeJson(res, 500, { ok: false, error: String(error.message || error) })
        }
      },
    },
    {
      kind: 'exact',
      path: `${API}/stamp`,
      handler: (req, res) => {
        if (req.method !== 'GET') return writeJson(res, 405, { ok: false, error: '只接受 GET' })
        if (!isLocal(req)) return writeJson(res, 403, { ok: false, error: '只允许本机访问' })
        try {
          writeJson(res, 200, { ok: true, stamp: currentStamp() })
        } catch (error) {
          writeJson(res, 500, { ok: false, error: String(error.message || error) })
        }
      },
    },
    {
      kind: 'exact',
      path: `${API}/refresh`,
      handler: (req, res) => {
        if (req.method !== 'POST') return writeJson(res, 405, { ok: false, error: '只接受 POST' })
        if (!isLocal(req)) return writeJson(res, 403, { ok: false, error: '只允许本机访问' })
        try {
          writeJson(res, 200, { ok: true, refresh: refreshSkillCatalog(ctx) })
        } catch (error) {
          writeJson(res, 500, { ok: false, error: String(error.message || error) })
        }
      },
    },
    {
      kind: 'exact',
      path: `${API}/apply`,
      handler: async (req, res) => {
        if (req.method !== 'POST') return writeJson(res, 405, { ok: false, error: '只接受 POST' })
        if (!isLocal(req)) return writeJson(res, 403, { ok: false, error: '只允许本机访问' })
        try {
          const body = await readJsonBody(req)
          writeJson(res, 200, handleApply(body, ctx))
        } catch (error) {
          writeJson(res, 400, { ok: false, error: String(error.message || error) })
        }
      },
    },
    {
      kind: 'exact',
      path: `${API}/rename`,
      handler: async (req, res) => {
        if (req.method !== 'POST') return writeJson(res, 405, { ok: false, error: '只接受 POST' })
        if (!isLocal(req)) return writeJson(res, 403, { ok: false, error: '只允许本机访问' })
        try {
          const body = await readJsonBody(req)
          writeJson(res, 200, handleRename(body, ctx))
        } catch (error) {
          writeJson(res, 400, { ok: false, error: String(error.message || error) })
        }
      },
    },
  ]

  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route))
    stampReady()
    // 别的插件改完技能不通知宿主时，由这里替它们唤醒斜杠菜单
    const watcher = createSkillWatcher(ctx, { everyMs: WATCH_EVERY_MS })
    watcher.start()
    console.log('[dsh-skill-order] ready')
    return () => {
      watcher.stop()
      for (const off of disposers) {
        try {
          off?.()
        } catch {
          /* ignore */
        }
      }
    }
  }, 'dsh-skill-order: routes')
}
