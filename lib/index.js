import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import {
  DESC_MAX,
  NAME_RE,
  applyOrder,
  descWidth,
  listSkills,
  maxIndex,
  normalizeStem,
  padWidth,
  renameSkill,
  replaceDescriptionLine,
  setSkillName,
  skillStamp,
  stemOf,
  uniqueStem,
} from './order.js'
import { pickNewSkills, readSettings, settingsPath, writeSettings } from './config.js'

export const name = 'dsh-skill-order'
export const inject = ['webServer', 'llm']

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

// ── 新技能自动规范：补编号、清词干、改写超长简介 ──────────────

export async function findHelperModel(ctx) {
  let providers
  try {
    providers = await ctx?.llm?.listProviders?.()
  } catch {
    return null
  }
  if (!Array.isArray(providers)) return null
  for (const provider of providers) {
    const providerId = typeof provider === 'string' ? provider : provider?.id ?? provider?.name
    if (!providerId) continue
    let models
    try {
      models = await ctx.llm.listModels(providerId)
    } catch {
      continue
    }
    if (!Array.isArray(models)) continue
    for (const model of models) {
      const modelId = typeof model === 'string' ? model : model?.id ?? model?.model
      if (modelId) return { provider: providerId, model: modelId }
    }
  }
  return null
}

const DESC_PROMPT = [
  '把下面这条技能简介改写成一句中文，20 个汉字以内（含标点）。',
  '要求：说清这个技能干什么用；不要引号、不要解释、不要换行。',
  '只输出改写后的这一句。',
  '原文：',
].join('\n')

// 交给模型改写；拿不到模型、报错、或改完仍然超长，一律返回 null 交给调用方保留原文。
export async function rewriteDescription(ctx, text) {
  const target = await findHelperModel(ctx)
  if (!target) return null
  let out = ''
  try {
    const stream = ctx.llm.stream({
      provider: target.provider,
      model: target.model,
      messages: [{ role: 'user', content: [{ type: 'text', text: DESC_PROMPT + text }] }],
    })
    for await (const chunk of stream) {
      if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') out += chunk.text
    }
  } catch {
    return null
  }
  const clean = out
    .trim()
    .split('\n')[0]
    .trim()
    .replace(/^["'「『]+|["'」』]+$/g, '')
    .trim()
  if (!clean) return null
  if (descWidth(clean) > DESC_MAX) return null
  return clean
}

// 把当前磁盘上「没见过」的技能收拾干净：补编号、清词干、超长简介改写。
// 后台刚收进来的新技能名，给界面提示用（只在内存里，重启就没了）
let lastAdopt = null

// 返回 { fresh: 数量, freshNames: [...], adopted: [...], rewritten: [...], failed: [...] }，供界面提示用。
export async function adoptFreshSkills(ctx, options = {}) {
  const home = options.home ?? dshHome()
  const roots = options.roots ?? skillRoots()
  const settings = options.settings ?? readSettings(home)
  let skills = options.skills ?? listSkills(roots)
  const result = { fresh: 0, freshNames: [], adopted: [], rewritten: [], failed: [] }

  // 第一次运行（没有快照）时先把当前全部记成已知，避免把已有技能当成新来的
  if (!settings.knownSkills.length) {
    writeSettings(home, { ...settings, knownSkills: skills.map((skill) => skill.id) })
    return result
  }

  const fresh = pickNewSkills(skills, settings.knownSkills)
  result.fresh = fresh.length
  if (!fresh.length) return result

  for (const item of fresh) {
    try {
      skills = listSkills(roots)
      const target = skills.find((skill) => skill.id === item.id)
      if (!target) continue

      const taken = new Set(
        skills.filter((skill) => skill.id !== target.id).map((skill) => stemOf(skill.name)),
      )
      const stem = uniqueStem(normalizeStem(target.dirName), taken)
      // 已经是「两位编号-规范词干」的就不动，只收拾不规范的（如 mem-skill-xxx-hash）
      const canonical =
        /^\d+-/.test(target.dirName) &&
        NAME_RE.test(target.dirName) &&
        stemOf(target.dirName) === stem
      let nextName = target.dirName
      if (!canonical) {
        const nextIndex = maxIndex(skills) + 1
        nextName = `${String(nextIndex).padStart(padWidth(skills.length + 1), '0')}-${stem}`
        setSkillName(target, nextName)
      }
      result.adopted.push({ from: item.dirName, to: nextName, renamed: nextName !== item.dirName })
      result.freshNames.push(nextName)

      skills = listSkills(roots)
      const now = skills.find((skill) => skill.source === item.source && skill.dirName === nextName)
      if (now && descWidth(now.description) > DESC_MAX) {
        const next = await rewriteDescription(ctx, now.description)
        if (!next) {
          result.failed.push({ id: now.id, error: '没能改写简介，保留原文' })
        } else {
          const md = join(now.dir, 'SKILL.md')
          const text = readFileSync(md, 'utf8')
          writeFileSync(md, replaceDescriptionLine(text, next), 'utf8')
          result.rewritten.push({ id: now.id, from: now.description, to: next })
        }
      }
    } catch (error) {
      result.failed.push({ id: item.id, error: String(error?.message || error) })
    }
  }

  skills = listSkills(roots)
  lastAdopt = { names: result.freshNames, at: Date.now() }
  writeSettings(home, { ...settings, knownSkills: skills.map((skill) => skill.id) })
  try {
    refreshSkillCatalog(ctx)
  } catch {
    /* 宿主没挂技能服务也不影响已完成的改名 */
  }
  return result
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
  let busy = false

  const tick = async () => {
    if (busy) return false
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
    busy = true
    try {
      try {
        refresh()
      } catch {
        /* 宿主没挂上技能服务也不影响后续轮询 */
      }
      if (typeof options.adopt === 'function') {
        try {
          await options.adopt()
        } catch {
          /* 规范化失败不影响后续轮询 */
        }
      }
    } finally {
      busy = false
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

export function apply(ctx, options = {}) {
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
      path: `${API}/settings`,
      handler: async (req, res) => {
        if (!isLocal(req)) return writeJson(res, 403, { ok: false, error: '只允许本机访问' })
        try {
          const home = dshHome()
          if (req.method === 'GET') {
            return writeJson(res, 200, { ok: true, settings: readSettings(home), path: settingsPath(home) })
          }
          if (req.method === 'POST') {
            const body = await readJsonBody(req)
            const current = readSettings(home)
            const next = writeSettings(home, {
              autoPopup: body?.autoPopup === undefined ? current.autoPopup : body.autoPopup,
              autoPinNew: body?.autoPinNew === undefined ? current.autoPinNew : body.autoPinNew,
              knownSkills: current.knownSkills,
            })
            return writeJson(res, 200, { ok: true, settings: next, path: settingsPath(home) })
          }
          return writeJson(res, 405, { ok: false, error: '只接受 GET / POST' })
        } catch (error) {
          writeJson(res, 400, { ok: false, error: String(error.message || error) })
        }
      },
    },
    {
      kind: 'exact',
      path: `${API}/fresh`,
      handler: (req, res) => {
        if (req.method !== 'GET') return writeJson(res, 405, { ok: false, error: '只接受 GET' })
        if (!isLocal(req)) return writeJson(res, 403, { ok: false, error: '只允许本机访问' })
        try {
          const home = dshHome()
          const settings = readSettings(home)
          const skills = listSkills(skillRoots())
          // 只报「后台刚收进来的那批」，一天内有效；后台已经把名字规范掉了，这里给的是最终名
          const recent = lastAdopt && Date.now() - lastAdopt.at < 86400000 ? lastAdopt.names : []
          const pending = pickNewSkills(skills, settings.knownSkills).map((skill) => skill.dirName)
          writeJson(res, 200, {
            ok: true,
            settings,
            skills,
            fresh: Array.from(new Set(recent.concat(pending))),
            stamp: currentStamp(),
          })
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
    const watcher = createSkillWatcher(ctx, {
      everyMs: WATCH_EVERY_MS,
      adopt: () => adoptFreshSkills(ctx),
    })
    watcher.start()
    // 启动时先把当前技能记成基线。否则第一次新增技能只会被当成「建基线」跳过，
    // 要等第二次变化才生效——新建技能的人会以为功能没做。
    // 测试传 adoptAtStart:false 跳过，免得跑一次测试就去改真实技能目录。
    if (options.adoptAtStart !== false) {
      void adoptFreshSkills(ctx).catch(() => {})
    }
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
