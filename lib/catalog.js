// 把「磁盘上能排序的技能」和「宿主注册表里的全部技能」合成一张分组清单。
//
// 为什么要两份：
// - 磁盘扫描（lib/order.js 的 listSkills）只知道我管得着的两个目录，能改名、能排序；
// - 宿主 ctx.skills.list() 知道 / 菜单里真正有哪些技能（系统内置、插件提供、自定义目录），
//   但拿到的只是摘要，改不了文件。
// 所以：能排序的照旧来自磁盘，其余按来源分组补在下面，标成只读。

export const GROUP_ORDER = ['user', 'bundled', 'provider']

export const GROUP_DEFS = {
  user: { id: 'user', title: '用户技能（含自定义目录）', hint: '可排序 · 可改名', sortable: true },
  bundled: { id: 'bundled', title: '系统内置', hint: '只读', sortable: false },
  provider: { id: 'provider', title: '由插件提供', hint: '不可排序', sortable: false },
}

// 本地扫描出来的 source（'user' / 'superpowers'）→ 分组
export function groupOfLocalSource() {
  // 两个磁盘根（~/.dsh/skills 与自定义目录）合并成一张可排序清单：
  // 排序是按全局位次重新编号的，分两组各自编号会让 / 菜单顺序对不上。
  return 'user'
}

// 宿主摘要里的 source（'user-dsh' / 'custom' / 'project-dsh' / 'bundled' / 插件自报）→ 分组
export function groupOfRegistrySource(source) {
  const raw = String(source || '')
  if (raw === 'user-dsh' || raw === 'user-agents') return 'user'
  if (raw === 'custom' || raw === 'project-dsh' || raw === 'project-agents') return 'user'
  if (raw === 'bundled') return 'bundled'
  return 'provider'
}

function normName(value) {
  // 磁盘上的名字带位置编号（01-xxx），注册表里的也是全名，直接按去掉前缀比一次即可
  return String(value || '').replace(/^(\d+-)+/, '')
}

/**
 * 从宿主注册表摘要里挑出「磁盘扫不到的那些」，按分组返回。
 *
 * @param {Array} summary  ctx.skills.list() 的返回值
 * @param {Array} local    listSkills() 的结果
 * @returns {Array<{id,name,description,group,provider,sortable:false}>}
 */
export function extrasOf(summary, local) {
  const known = new Set()
  for (const skill of local || []) {
    known.add(normName(skill.name))
    known.add(normName(skill.dirName))
  }
  const out = []
  const seen = new Set()
  for (const item of summary || []) {
    const name = String(item?.name || '')
    if (!name || seen.has(name)) continue
    if (known.has(name) || known.has(normName(name))) continue
    seen.add(name)
    const group = groupOfRegistrySource(item?.source)
    out.push({
      id: `registry:${name}`,
      name,
      description: String(item?.description || ''),
      whenToUse: String(item?.whenToUse || ''),
      group,
      provider: String(item?.provider || ''),
      source: String(item?.source || ''),
      sortable: false,
    })
  }
  out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return out
}

/** 给界面用的分组元数据（含每组的条数）。 */
export function groupSummary(local, extras) {
  const counts = { user: 0, custom: 0, bundled: 0, provider: 0 }
  for (const skill of local || []) counts[groupOfLocalSource(skill.source)] += 1
  for (const item of extras || []) counts[item.group] = (counts[item.group] || 0) + 1
  return GROUP_ORDER.filter((id) => counts[id] > 0).map((id) => ({
    ...GROUP_DEFS[id],
    count: counts[id],
  }))
}
