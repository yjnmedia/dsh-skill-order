import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const DEFAULT_SETTINGS = {
  // 发现新技能时自动打开「技能排序」页并排在最前
  autoPopup: true,
  // 新技能自动排到列表最前（默认按名字排，开的这个再把它顶到第 1 位）
  autoPinNew: true,
  // 上次见过的技能 id，用来判断谁是「新来的」
  knownSkills: [],
  // 已经自动规范过、但用户还没点「应用」确认的新技能 id；点了应用就清空。
  // 放磁盘是为了刷新页面、重载插件、重启软件都还认得出来。
  pendingNew: [],
}

const strings = (value) =>
  Array.isArray(value) ? value.filter((x) => typeof x === 'string' && x.length > 0) : []

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
      knownSkills: strings(raw.knownSkills),
      pendingNew: strings(raw.pendingNew),
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
    knownSkills: strings(next?.knownSkills),
    pendingNew: strings(next?.pendingNew),
  }
  io.mkdirSync(dirname(file), { recursive: true })
  io.writeFileSync(file, JSON.stringify(safe, null, 2) + '\n', 'utf8')
  return safe
}

// 跟已知清单对比，找出这次新出现的技能 id（保持传入顺序）。
export function pickNewSkills(skills, knownSkills) {
  const seen = new Set(Array.isArray(knownSkills) ? knownSkills : [])
  if (seen.size === 0) return []
  return (skills || []).filter((skill) => skill && skill.id && !seen.has(skill.id))
}

// 待确认的新技能：拿配置里记的 id 去当前技能里找，找不到（已删/已改名）的自动作废。
export function pickPendingSkills(skills, pendingNew) {
  const wanted = new Set(Array.isArray(pendingNew) ? pendingNew : [])
  if (wanted.size === 0) return []
  return (skills || []).filter((skill) => skill && skill.id && wanted.has(skill.id))
}
