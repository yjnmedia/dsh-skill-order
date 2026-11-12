import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { stemOf } from './order.js'

export const DEFAULT_SETTINGS = {
  // 发现新技能时自动打开「技能排序」页并排在最前
  autoPopup: true,
  // 新技能自动排到列表最前（默认按名字排，开的这个再把它顶到第 1 位）
  autoPinNew: true,
  // 上次见过的技能身份，用来判断谁是「新来的」
  knownSkills: [],
  // 已经自动规范过、但用户还没点「应用」确认的新技能身份；点了应用就清空。
  // 放磁盘是为了刷新页面、重载插件、重启软件都还认得出来。
  pendingNew: [],
}

const strings = (value) =>
  Array.isArray(value) ? value.filter((x) => typeof x === 'string' && x.length > 0) : []

// 技能身份 = 「来源:词干」，不含编号。
// 1.0.15 及以前用的是带编号的目录名，一重排（编号全变）就全部对不上，
// 导致每次应用后都把全部技能当成新技能再排一遍。改用词干后重排不影响身份。
export function skillKey(skill) {
  if (!skill) return ''
  const source = String(skill.source || 'user')
  const name = String(skill.name || skill.dirName || '')
  // 只有 id 的调用方（老测试、宿主其它来源）直接按 id 归一化
  if (!name) return normalizeKey(skill.id)
  return `${source}:${stemOf(name)}`
}

// 兼容旧配置（`user:01-report-todo` 这种带编号的写法），读进来先归一化成词干形式。
export function normalizeKey(raw) {
  const text = String(raw || '')
  const cut = text.indexOf(':')
  if (cut < 0) return text.replace(/^\d+-/, '')
  return `${text.slice(0, cut)}:${text.slice(cut + 1).replace(/^\d+-/, '')}`
}

export function settingsPath(home) {
  return join(home, 'dsh-skill-order.json')
}

export function readSettings(home, io = { existsSync, readFileSync }) {
  const file = settingsPath(home)
  if (!io.existsSync(file)) return { ...DEFAULT_SETTINGS }
  try {
    const raw = JSON.parse(io.readFileSync(file, 'utf8'))
    return {
      autoPopup: raw.autoPopup !== false,
      autoPinNew: raw.autoPinNew !== false,
      knownSkills: strings(raw.knownSkills).map(normalizeKey),
      pendingNew: strings(raw.pendingNew).map(normalizeKey),
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function writeSettings(home, next, io = { existsSync, readFileSync, writeFileSync, mkdirSync }) {
  const file = settingsPath(home)
  const safe = {
    autoPopup: next?.autoPopup !== false,
    autoPinNew: next?.autoPinNew !== false,
    knownSkills: Array.from(new Set(strings(next?.knownSkills).map(normalizeKey))),
    pendingNew: Array.from(new Set(strings(next?.pendingNew).map(normalizeKey))),
  }
  io.mkdirSync(dirname(file), { recursive: true })
  io.writeFileSync(file, JSON.stringify(safe, null, 2) + '\n', 'utf8')
  return safe
}

// 跟已知清单对比，找出这次新出现的技能（保持传入顺序）。
export function pickNewSkills(skills, knownSkills) {
  const seen = new Set(strings(knownSkills).map(normalizeKey))
  if (seen.size === 0) return []
  return (skills || []).filter((skill) => skill && skillKey(skill) && !seen.has(skillKey(skill)))
}

// 待确认的新技能：拿配置里记的身份去当前技能里找，找不到（已删/已改名）的自动作废。
export function pickPendingSkills(skills, pendingNew) {
  const wanted = new Set(strings(pendingNew).map(normalizeKey))
  if (wanted.size === 0) return []
  return (skills || []).filter((skill) => skill && skillKey(skill) && wanted.has(skillKey(skill)))
}

// 技能改了词干（身份跟着变）时，把配置里的旧身份换成新的。
// 插件自己改名时必须调它，否则下一次检查会把刚改过名的技能当成新技能再排一遍。
export function renameKeys(oldSkill, newName, settings) {
  const before = `${String(oldSkill.source || 'user')}:${stemOf(oldSkill.name || oldSkill.dirName || '')}`
  const after = `${String(oldSkill.source || 'user')}:${stemOf(newName)}`
  const swap = (list) =>
    Array.from(new Set(strings(list).map((key) => (normalizeKey(key) === normalizeKey(before) ? after : normalizeKey(key)))))
  return {
    ...settings,
    knownSkills: swap(settings?.knownSkills),
    pendingNew: swap(settings?.pendingNew),
  }
}
