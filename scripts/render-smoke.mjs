// 客户端渲染冒烟：用假 React 把技能排序面板真渲染一遍，中英各一次。
// 只读、不联网、不启动服务。运行：node scripts/render-smoke.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const clientPath = process.argv[2] || path.join(here, '..', 'lib', 'client.js')
const EN = process.env.SMOKE_EN === '1'

let definition
globalThis.window = {
  __ModuleLoader__: { load(def) { definition = def } },
  __DSO_LANG__: EN ? 'en' : 'zh',
  localStorage: { getItem: () => null, setItem: () => {} },
  confirm: () => true,
  navigator: { language: EN ? 'en-US' : 'zh-CN' },
}
const skills = [
  { id: '10-image-prompt', name: '10-image-prompt', description: '按五段式编写文生图正面词与负面词', source: 'user' },
  { id: '01-readme-rewrite', name: '01-readme-rewrite', description: '把仓库首页按读者视角重排', source: 'superpowers' },
]
const extras = [
  { id: 'registry:expert-ai-image', name: 'expert-ai-image', description: 'AI 生图资料库', group: 'provider', provider: 'expert-role' },
  { id: 'registry:builtin-one', name: 'builtin-one', description: '系统自带的一个技能', group: 'bundled', provider: 'filesystem' },
]
globalThis.fetch = async (url) => {
  const p = String(url)
  const body = p.includes('/fresh')
    ? { ok: true, fresh: ['01-readme-rewrite'], settings: { autoPopup: true, autoPinNew: true } }
    : { ok: true, skills, extras }
  return { ok: true, status: 200, json: async () => body }
}

await import(pathToFileURL(clientPath).href + '?t=' + Date.now())
if (!definition) throw new Error('client bundle 没有调用 window.__ModuleLoader__.load')

let drive = null
const React = {
  createElement(type, props, ...children) {
    return { type, props: props || {}, children }
  },
  useState(initial) {
    const index = drive ? drive.i++ : -1
    const value = drive && drive.seq[index] !== undefined ? drive.seq[index] : initial
    return [value, () => {}]
  },
  useEffect() {},
  useRef(value) { return { current: value } },
  useCallback(fn) { return fn },
  useMemo(fn) { return fn() },
}
const api = definition.factory((name) => {
  if (name !== 'react') throw new Error('未知 require：' + name)
  return React
})

let page = null
api.apply({
  effect(fn) { const d = fn(); return typeof d === 'function' ? d : () => {} },
  slots: {
    inject(name, factory) { return factory() },
    register(spec, component) { page = component; return () => {} },
  },
})
if (!page) throw new Error('没有注册设置页')

const skillsWithFlags = skills.map((s) => Object.assign({}, s))
const seq = [
  skillsWithFlags, false, false, '', '', null, '', '', '', [], EN ? 'en' : 'zh',
  { autoPopup: true, autoPinNew: true }, extras, {},
]
drive = { seq, i: 0 }
const collected = []
const failures = []
let tree
try {
  tree = page({})
} catch (error) {
  failures.push('渲染抛错：' + error.message)
}
function textsOf(node, out) {
  if (node === null || node === undefined || node === false) return out
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return out }
  if (Array.isArray(node)) { node.forEach((child) => textsOf(child, out)); return out }
  if (typeof node !== 'object') return out
  const children = node.children || (node.props && node.props.children)
  if (children !== undefined) textsOf(children, out)
  if (node.props) {
    for (const key of ['title', 'aria-label']) {
      if (typeof node.props[key] === 'string') out.push(node.props[key])
    }
  }
  return out
}
textsOf(tree, collected)
const text = collected.join(' ')

if (failures.length === 0) {
  if (EN) {
    if (!text.includes('Skill order')) failures.push('EN：标题没翻成 Skill order')
    if (!text.includes('Apply')) failures.push('EN：缺少 Apply 按钮')
    if (!text.includes('skills')) failures.push('EN：缺少数量文案（N skills）')
    for (const word of ['User skills', 'Custom directories', 'Built-in', 'Provided by plugins', 'not sortable']) {
      if (!text.includes(word)) failures.push('EN：缺少分组文案 ' + word)
    }
    const CHROME = ['技能排序', '应用', '刷新', '读取中', '改名字', '移到第 1 位', '知道了', '用户技能', '自定义目录', '系统内置']
    const hits = CHROME.filter((w) => text.includes(w))
    if (hits.length > 0) failures.push('EN：界面文案没翻干净：' + hits.join('、'))
  } else {
    if (!text.includes('技能排序')) failures.push('中文：标题不对')
    if (!text.includes('应用')) failures.push('中文：缺少「应用」按钮')
    if (!text.includes('共 4 个')) failures.push('中文：缺少数量文案（共 N 个）')
    if (!text.includes('用户技能')) failures.push('中文：缺少「用户技能」分组')
    if (!text.includes('自定义目录')) failures.push('中文：缺少「自定义目录」分组')
    if (!text.includes('系统内置')) failures.push('中文：缺少「系统内置」分组')
    if (!text.includes('由插件提供')) failures.push('中文：缺少「由插件提供」分组')
  }
  const src = fs.readFileSync(clientPath, 'utf8')
  if (!src.includes('dsh-skill-order-lang')) failures.push('语言选择没有落到 localStorage')
}

if (process.env.DUMP) fs.writeFileSync('.render-text.txt', text, 'utf8')
if (failures.length > 0) {
  console.error('渲染失败：')
  for (const item of new Set(failures)) console.error('  ' + item)
  if (process.env.DUMP) console.error(text.slice(0, 2000))
  process.exit(1)
}
console.log('OK：' + (EN ? 'English' : '中文') + ' 面板渲染通过，收集到 ' + collected.length + ' 段文字')
