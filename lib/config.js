import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const DEFAULT_SETTINGS = {
  // 发现新技能时自动打开「技能排序」页并排在最前
  autoPopup: true,
  // 新技能自动排到列表最前（默认按名字排，开的这个再把它顶到第 1 位）
  autoPinNew: true,
  // 上次见过的技能 id，用来判断谁是「新来的」
  knownSkills: [],
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
      knownSkills: Array.isArray(raw.knownSkills) ? raw.knownSkills.filter((x) => typeof x === 'string') : [],
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
    knownSkills: Array.isArray(next?.knownSkills) ? next.knownSkills.filter((x) => typeof x === 'string') : [],
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
