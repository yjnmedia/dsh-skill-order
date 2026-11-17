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
let DUMP_CSS = ''
if (process.env.DUMP_HTML) {
  const src = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  const start = src.indexOf('var CSS = [')
  const end = src.indexOf('].join(', start)
  const body = src.slice(start + 'var CSS = ['.length, end)
  DUMP_CSS = body.split('\n').map((line) => line.trim().replace(/,$/, '')).filter(Boolean)
    .map((line) => { try { return eval(line) } catch { return '' } }).join('')
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
if (!page) throw new Error('没有注册左栏入口')

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
  // 左栏入口注册的是外壳组件，把外壳里的页面组件展开一层再收集文字
  tree = resolve(tree, 0);
} catch (error) {
  failures.push('渲染抛错：' + error.message)
}
function resolve(node, depth) {
  if (depth > 6 || node === null || node === undefined || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map((child) => resolve(child, depth + 1))
  if (typeof node.type === 'function') return resolve(node.type(node.props || {}), depth + 1)
  if (node.children !== undefined) {
    return Object.assign({}, node, { children: resolve(node.children, depth + 1) })
  }
  if (node.props && node.props.children !== undefined) {
    return Object.assign({}, node, { props: Object.assign({}, node.props, { children: resolve(node.props.children, depth + 1) }) })
  }
  return node
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
if (process.env.DUMP_HTML) {
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const styleAttr = (st) => st && typeof st === 'object'
    ? Object.keys(st).map((k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()) + ':' + st[k]).join(';')
    : ''
  function html(node) {
    if (node === null || node === undefined || node === false) return ''
    if (typeof node === 'string' || typeof node === 'number') return esc(node)
    if (Array.isArray(node)) return node.map(html).join('')
    const t = node.type
    const props = node.props || {}
    if (typeof t === 'function') return html(t(props))
    if (t === undefined) return html(node.children || '')
    if (t === 'input') return '<input type="' + (props.type || 'text') + '"' + (props.checked ? ' checked' : '') + '>'
    const children = node.children !== undefined ? node.children : props.children
    let attrs = ''
    if (typeof t === 'string') {
      if (props.className) attrs += ' class="' + esc(props.className) + '"'
      const st = styleAttr(props.style)
      if (st) attrs += ' style="' + esc(st) + '"'
    }
    return '<' + t + attrs + '>' + html(children) + '</' + t + '>'
  }
  const out = '<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:20px 24px;font-family:"Microsoft YaHei","Segoe UI",system-ui,sans-serif;background:#fff}' + DUMP_CSS + '</style></head><body>' + html(tree) + '</body></html>'
  fs.writeFileSync(process.env.DUMP_HTML, out, 'utf8')
  console.log('已导出 ' + process.env.DUMP_HTML)
}

textsOf(tree, collected)
if (process.env.DEBUG_SMOKE) console.log(JSON.stringify(collected))
const text = collected.join(' ')

if (failures.length === 0) {
  if (EN) {
    if (!text.includes('Skill order')) failures.push('EN：标题没翻成 Skill order')
    if (!text.includes('Apply')) failures.push('EN：缺少 Apply 按钮')
    if (!text.includes('skills')) failures.push('EN：缺少数量文案（N skills）')
    for (const word of ['User skills (incl. custom directories)', 'Built-in', 'Provided by plugins', 'not sortable']) {
      if (!text.includes(word)) failures.push('EN：缺少分组文案 ' + word)
    }
    const CHROME = ['技能排序', '应用', '刷新', '读取中', '改名字', '移到第 1 位', '知道了', '用户技能', '系统内置']
    const hits = CHROME.filter((w) => text.includes(w))
    if (hits.length > 0) failures.push('EN：界面文案没翻干净：' + hits.join('、'))
  } else {
    if (!text.includes('技能排序')) failures.push('中文：标题不对')
    if (!text.includes('应用')) failures.push('中文：缺少「应用」按钮')
    if (!text.includes('共 4 个')) failures.push('中文：缺少数量文案（共 N 个）')
    if (!text.includes('用户技能')) failures.push('中文：缺少「用户技能」分组')
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
