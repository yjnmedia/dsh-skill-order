window.__ModuleLoader__.load({
  id: 'dsh-skill-order',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    var React = require('react')
    var rawh = React.createElement

    // 界面语言（用户 2026-11-16 定）：只翻界面文字，技能名与简介来自磁盘，保持原样。
    var LANG = 'zh'
    try {
      if (typeof window !== 'undefined' && (window.__DSO_LANG__ === 'en' || window.__DSO_LANG__ === 'zh')) LANG = window.__DSO_LANG__
    } catch (error) {}
    function initialLang() {
      if (typeof window === 'undefined') return 'zh'
      try {
        var saved = window.localStorage && window.localStorage.getItem('dsh-skill-order-lang')
        if (saved === 'en' || saved === 'zh') return saved
        var nav = (window.navigator && window.navigator.language) || ''
        if (/^zh/i.test(nav)) return 'zh'
        if (nav) return 'en'
      } catch (error) {}
      return 'zh'
    }

    var EN_EXACT = {
      '技能排序': 'Skill order',
      '拖动条目排出顺序；点右侧图标把该条直接送到第 1 位，其余依次下移一位。铅笔图标可以改这条技能的名字（只用小写英文、数字和连字符）。点「应用」才会真正改文件夹名和技能文件里的名字，斜杠菜单按这个顺序排。':
        'Drag items to set the order; the arrow button sends an item straight to position 1 and shifts the rest down one. The pencil renames a skill (lowercase letters, digits and hyphens only). Nothing touches disk until you click Apply, and the slash menu follows this order.',
      '带「升级包」标记的是 superpowers，升级那个插件时文件夹名会被盖回去，到时需要再排一次。软件自带的 8 个技能不在这个列表里。':
        'Items tagged “bundle” belong to superpowers; upgrading that plugin overwrites their folder names, so you will need to reorder once more. The 8 built-in skills are not listed here.',
      '发现新技能时在页面顶部提示': 'Show a banner when new skills are found',
      '新技能按名字排到最前': 'Put new skills first, sorted by name',
      '知道了': 'Got it',
      '应用': 'Apply',
      '刷新': 'Refresh',
      '读取中…': 'Loading…',
      '正在改名…': 'Renaming…',
      '读取失败': 'Could not load',
      '改名失败': 'Rename failed',
      '应用失败': 'Apply failed',
      '确定': 'OK',
      '取消': 'Cancel',
      '确认': 'Confirm',
      '新名字': 'New name',
      '回车确定，Esc 取消': 'Enter to confirm, Esc to cancel',
      '改完才能拖动': 'finish editing to drag',
      '按住拖动排序': 'hold and drag to reorder',
      '不要自己写数字编号': 'do not type the numeric prefix',
      '名字不能为空': 'name cannot be empty',
      '只能用小写英文、数字和连字符': 'lowercase letters, digits and hyphens only',
      '磁盘上的技能有变化，点「刷新」查看': 'Skills on disk changed; click Refresh',
      '升级包': 'bundle',
      '本地': 'local',
      '改名字': 'Rename',
      '已经在第 1 位': 'Already first',
      '移到第 1 位': 'Move to first',
      '简介超过 20 个字，建议改短': 'description is over 20 characters, consider shortening it',
      '当前排序还没点「应用」，刷新会丢掉这些调整。继续？': 'The new order is not applied yet; refreshing discards it. Continue?',
      '这个顺序会被写入磁盘，确定吗？': 'This order will be written to disk. Continue?',
      '按来源分组：能拖动的那些会改文件夹名；点右侧「↥」直接送到本组第 1 位，铅笔可以改名字（只用小写英文、数字和连字符）。点「应用」才会真正改磁盘，斜杠菜单按这个顺序排。':
        'Grouped by source. Draggable rows are renamed on disk; the arrow button sends a skill to the top of its own group, and the pencil renames it (lowercase letters, digits and hyphens only). Nothing touches disk until you click Apply, and the slash menu follows this order.',
      '带「升级包」标记的是 superpowers，升级那个插件时文件夹名会被盖回去，到时需要再排一次。由插件提供的技能不在这份清单里排序，挪不动。':
        'Items tagged “bundle” belong to superpowers; upgrading that plugin overwrites their folder names, so you will need to reorder once more. Skills provided by plugins cannot be reordered here.',
      '用户技能（~/.dsh/skills）': 'User skills (~/.dsh/skills)',
      '自定义目录': 'Custom directories',
      '系统内置': 'Built-in',
      '由插件提供': 'Provided by plugins',
      '可排序 · 可改名': 'sortable · renamable',
      '可排序': 'sortable',
      '只读': 'read-only',
      '不可排序': 'not sortable',
      '由插件提供，不能排序': 'provided by a plugin; cannot reorder',
    }

    var EN_RULES = [
      [/^已经有一个叫 (.+) 的了$/, 'There is already one called $1'],
      [/^接口返回不是 JSON（HTTP (\d+)）$/, 'Response was not JSON (HTTP $1)'],
      [/^共 (\d+) 个$/, '$1 skills'],
      [/^超 (\d+)$/, 'over by $1'],
      [/^发现 (\d+) 个新技能$/, 'Found $1 new skills'],
      [/^，已按名字排到最前：(.+?) 等。确认没问题再点「应用」，不点不会改磁盘。$/, ', pinned to the top by name: $1, and more. Click Apply when it looks right; nothing changes on disk until you do.'],
      [/^，已按名字排到最前：(.+)。确认没问题再点「应用」，不点不会改磁盘。$/, ', pinned to the top by name: $1. Click Apply when it looks right; nothing changes on disk until you do.'],
      [/^还有 (\d+) 个技能的简介超过 20 个字（列表里标了「超 N」），仍要应用吗？$/, '$1 skills have descriptions over 20 characters (marked “over by N”). Apply anyway?'],
      [/^已改 (\d+) 项，正在同步斜杠菜单…$/, 'Renamed $1 items, syncing the slash menu…'],
      [/^已改 (\d+) 项，插件代码也有更新，正在重载，几秒后按 F5 刷新本窗口即可用上新代码。$/, 'Renamed $1 items. Plugin code changed too and is reloading; press F5 in a few seconds to pick it up.'],
      [/^已改 (\d+) 项，斜杠菜单已同步。$/, 'Renamed $1 items, slash menu synced.'],
      [/^已改 (\d+) 项。斜杠菜单会在一两秒内自动同步。$/, 'Renamed $1 items. The slash menu syncs within a second or two.'],
      [/^已改 (\d+) 项$/, 'Renamed $1 items'],
      [/^已改名为 (.+)$/, 'Renamed to $1'],
      [/^\n?简介宽度 (\d+) \/ 上限 (\d+)$/, '\ndescription width $1 / limit $2'],
      [/^(\d+) 个$/, '$1'],
    ]

    function enText(text) {
      var exact = EN_EXACT[text]
      if (exact !== undefined) return exact
      for (var i = 0; i < EN_RULES.length; i += 1) {
        var hit = EN_RULES[i][0].exec(text)
        if (hit) {
          var out = EN_RULES[i][1]
          for (var g = 1; g < hit.length; g += 1) out = out.split('$' + g).join(hit[g])
          return out
        }
      }
      return text
    }

    function t(text) {
      if (LANG === 'zh' || typeof text !== 'string') return text
      return enText(text)
    }

    function localizeChild(child) {
      if (typeof child === 'string') return t(child)
      if (Array.isArray(child)) return child.map(localizeChild)
      return child
    }

    function h() {
      var args = [arguments[0], arguments[1]]
      for (var i = 2; i < arguments.length; i += 1) args.push(localizeChild(arguments[i]))
      return rawh.apply(null, args)
    }
    var useState = React.useState
    var useEffect = React.useEffect
    var useRef = React.useRef

    var API = '/api/dsh-skill-order'
    var STYLE_ID = 'dsh-skill-order-style'

    var CSS = [
      '.dso{display:flex;flex-direction:column;gap:10px;padding:4px 0 12px;max-width:760px;max-height:calc(100vh - 120px);min-height:0;box-sizing:border-box;',
      '.dso-main{padding:20px 24px 28px;height:100%;overflow:auto;box-sizing:border-box;}',
      '.dso-main .dso{max-height:none;padding-bottom:0;}',
      'font-size:13px;line-height:1.55;color:var(--dsw-alias-label-primary,#1f2328);}',
      '.dso h2{margin:0;font-size:16px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);}',
      '.dso-note,.dso-status{font-size:12px;color:var(--dsw-alias-label-secondary,#68717d);}',
      '.dso-warn{font-size:12px;color:var(--dsw-alias-state-warn-primary,#a86400);}',
      '.dso-status.err{color:var(--dsw-alias-state-error-primary,#d64545);}',
      '.dso-status.ok{color:var(--dsw-alias-state-success-primary,#1a7f37);}',
      '.dso-status.warn{color:var(--dsw-alias-state-warn-primary,#b25e09);}',
      '.dso-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px;}',
      '.dso-ops{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-size:12px;opacity:.9;}',
      '.dso-op{display:flex;align-items:center;gap:6px;cursor:pointer;}',
      '.dso-fresh{margin-top:8px;padding:10px 12px;border:1px solid var(--dsw-alias-state-warn-primary,#d97706);border-radius:8px;display:flex;gap:10px;align-items:flex-start;justify-content:space-between;}',
      '.dso-btn{height:32px;padding:0 14px;border-radius:var(--dsw-radius-sm,8px);white-space:nowrap;flex:none;',
      'border:0.5px solid var(--dsw-alias-border-l2,#d9dde3);',
      'background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary,#1f2328);',
      'font:inherit;font-size:13px;cursor:pointer;transition:background .15s,border-color .15s,opacity .15s;}',
      '.dso-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.08));}',
      '.dso-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4176e6);outline-offset:2px;}',
      '.dso-btn.primary{background:var(--dsw-alias-button-primary-fill,#4176e6);',
      'border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff);}',
      '.dso-btn.primary:hover:not(:disabled){opacity:.88;}',
      '.dso-btn:disabled{opacity:.45;cursor:not-allowed;}',
      '.dso-count{margin-left:auto;font-size:12px;color:var(--dsw-alias-label-tertiary,#8b929c);}',
      '.dso[data-fit]{max-height:none;}',
      '.dso[data-fit] .dso-list{max-height:none;}',
      '.dso-list{list-style:none;margin:0;padding:0;flex:1 1 auto;min-height:0;',
      'overflow-y:auto;overflow-x:hidden;max-height:calc(100vh - 250px);',
      'border:0.5px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:var(--dsw-radius-lg,12px);',
      'background:var(--dsw-alias-bg-layer-1,transparent);}',
      '.dso-item{display:flex;align-items:center;gap:8px;padding:11px 13px;',
      'border-top:0.5px solid var(--dsw-alias-border-l1,#eceef1);background:transparent;}',
      '.dso-item:first-child{border-top:0;}',
      '.dso-item.dragging{opacity:.4;}',
      '.dso-item.drop-before{box-shadow:inset 0 2px 0 var(--dsw-alias-brand-primary,#4176e6);}',
      '.dso-item.drop-after{box-shadow:inset 0 -2px 0 var(--dsw-alias-brand-primary,#4176e6);}',
      '.dso-handle{display:inline-flex;align-items:center;justify-content:center;',
      'width:16px;height:22px;flex:none;cursor:grab;user-select:none;',
      'color:var(--dsw-alias-label-tertiary,#8b929c);transition:color .15s;}',
      '.dso-item:hover .dso-handle{color:var(--dsw-alias-label-secondary,#68717d);}',
      '.dso-handle:active{cursor:grabbing;}',
      '.dso-idx{flex:none;width:22px;font-size:12px;font-variant-numeric:tabular-nums;',
      'color:var(--dsw-alias-label-tertiary,#8b929c);}',
      '.dso-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}',
      '.dso-name{font-size:13.5px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);',
      'word-break:break-all;}',
      '.dso-desc{font-size:12px;color:var(--dsw-alias-label-secondary,#68717d);',
      'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.dso-desc.over{color:var(--dsw-alias-state-warn-primary,#b25e09);}',
      '.dso-over{flex:none;font-size:11px;white-space:nowrap;padding:1px 6px;border-radius:9px;',
      'color:var(--dsw-alias-state-warn-primary,#b25e09);',
      'border:0.5px solid var(--dsw-alias-state-warn-primary,#b25e09);}',
      '.dso-tag{flex:none;font-size:11px;white-space:nowrap;padding:1px 8px;border-radius:9px;',
      'color:var(--dsw-alias-label-secondary,#68717d);border:0.5px solid var(--dsw-alias-border-l2,#d9dde3);}',
      '.dso-pin{flex:none;display:inline-flex;align-items:center;justify-content:center;',
      'width:22px;height:22px;padding:0;border:0;border-radius:var(--dsw-radius-sm,8px);',
      'background:transparent;color:var(--dsw-alias-label-tertiary,#8b929c);cursor:pointer;',
      'transition:background .15s,color .15s,opacity .15s;}',
      '.dso-pin:hover:not(:disabled){color:var(--dsw-alias-link,#4176e6);',
      'background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.10)));}',
      '.dso-pin:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4176e6);outline-offset:1px;}',
      '.dso-pin:disabled{opacity:.3;cursor:default;}',
      '.dso-pin svg,.dso-handle svg,.dso-pen svg{display:block;}',
      '.dso-pen{flex:none;display:inline-flex;align-items:center;justify-content:center;',
      'width:22px;height:22px;padding:0;border:0;border-radius:var(--dsw-radius-sm,8px);',
      'background:transparent;color:var(--dsw-alias-label-tertiary,#8b929c);cursor:pointer;',
      'transition:background .15s,color .15s,opacity .15s;}',
      '.dso-pen:hover:not(:disabled){color:var(--dsw-alias-link,#4176e6);',
      'background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.10)));}',
      '.dso-pen:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4176e6);outline-offset:1px;}',
      '.dso-pen:disabled{opacity:.3;cursor:default;}',
      '.dso-edit{flex:1;min-width:0;display:flex;align-items:center;gap:6px;}',
      '.dso-edit input{flex:1;min-width:0;height:28px;padding:0 8px;font:inherit;font-size:13px;',
      'border:0.5px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:var(--dsw-radius-sm,8px);',
      'background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary,#1f2328);}',
      '.dso-edit input:focus{outline:2px solid var(--dsw-alias-brand-primary,#4176e6);outline-offset:0;}',
      '.dso-edit input.bad{border-color:var(--dsw-alias-state-error-primary,#d64545);}',
      '.dso-edit .dso-hint{font-size:11.5px;white-space:nowrap;',
      'color:var(--dsw-alias-state-error-primary,#d64545);}',
      '.dso-edit .dso-btn{height:28px;padding:0 10px;font-size:12.5px;}',
      '.dso-item.editing{background:var(--dsw-alias-bg-layer-2,transparent);}',
      '.dso-groups{display:flex;flex-direction:column;gap:10px;flex:1 1 auto;min-height:0;overflow-y:auto;}',
      '.dso-group{border:0.5px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:var(--dsw-radius-lg,12px);',
      'background:var(--dsw-alias-bg-layer-1,transparent);overflow:hidden;flex:none;}',
      '.dso-ghead{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:0;',
      'background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}',
      '.dso-ghead:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.06));}',
      '.dso-caret{width:12px;flex:none;color:var(--dsw-alias-label-tertiary,#8b929c);font-size:11px;}',
      '.dso-gname{font-size:13.5px;font-weight:650;}',
      '.dso-gcnt{font-size:12px;color:var(--dsw-alias-label-tertiary,#8b929c);}',
      '.dso-gtag{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary,#68717d);',
      'border:0.5px solid var(--dsw-alias-border-l2,#d9dde3);border-radius:9px;padding:1px 8px;white-space:nowrap;}',
      '.dso-group .dso-list{max-height:none;border:0;border-top:0.5px solid var(--dsw-alias-border-l1,#eceef1);border-radius:0;}',
      '.dso-item.readonly .dso-handle{opacity:.35;cursor:not-allowed;}',
      '.dso-tag.prov{color:#8250df;border-color:#e4d6fb;background:#faf5ff;}',
      '.dso-emptygroup{padding:10px 12px;font-size:12px;color:var(--dsw-alias-label-tertiary,#8b929c);}',
    ].join('')

    function ensureStyle() {
      if (typeof document === 'undefined') return
      if (document.getElementById(STYLE_ID)) return
      var style = document.createElement('style')
      style.id = STYLE_ID
      style.textContent = CSS
      ;(document.head || document.documentElement).appendChild(style)
    }

    // Lucide arrow-up-to-line（viewBox 24，stroke 2，圆头圆角）
    function iconToTop() {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 16,
        height: 16,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
        h('path', { key: 'a', d: 'M5 3h14' }),
        h('path', { key: 'b', d: 'm18 13-6-6-6 6' }),
        h('path', { key: 'c', d: 'M12 7v14' })
      )
    }

    // 拖拽把手：2 列 3 行圆点，几何固定，不受字体影响
    function iconGrip() {
      var dots = []
      for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 2; col++) {
          dots.push(h('circle', {
            key: 'd' + col + row,
            cx: 4 + col * 4,
            cy: 3 + row * 4,
            r: 1.15,
          }))
        }
      }
      return h('svg', {
        viewBox: '0 0 12 16',
        width: 12,
        height: 16,
        fill: 'currentColor',
        'aria-hidden': 'true',
        focusable: 'false',
      }, dots)
    }

    // Lucide pencil
    function iconPencil() {
      return h('svg', {
        viewBox: '0 0 24 24',
        width: 15,
        height: 15,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        focusable: 'false',
      },
        h('path', { key: 'a', d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }),
        h('path', { key: 'b', d: 'm15 5 4 4' })
      )
    }

    var NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

    // 返回空串表示合法；否则是给用户看的一句话原因。
    function stemProblem(value, skills, selfId) {
      var stem = String(value === undefined || value === null ? '' : value).trim()
      if (!stem) return '名字不能为空'
      if (/^\d+-/.test(stem)) return '不要自己写数字编号'
      if (!NAME_RE.test(stem)) return '只能用小写英文、数字和连字符'
      if (Array.isArray(skills)) {
        for (var i = 0; i < skills.length; i += 1) {
          var other = skills[i]
          if (!other || other.id === selfId) continue
          if (stemOf(other.name) === stem) return '已经有一个叫 ' + stem + ' 的了'
        }
      }
      return ''
    }

    function pad2(index1, count) {
      var width = count <= 99 ? 2 : String(count).length
      return String(index1).padStart(width, '0')
    }

    function stemOf(name) {
      return String(name || '').replace(/^(\d+-)+/, '') || String(name || '')
    }

    function sourceLabel(source) {
      return source === 'superpowers' ? '升级包' : '本地'
    }

    // 简介上限：40 个显示宽度 = 20 个汉字（汉字算 2，其余算 1）
    var DESC_MAX = 40
    function descWidth(text) {
      if (!text) return 0
      var w = 0
      for (var i = 0; i < text.length; i += 1) {
        var c = text.charCodeAt(i)
        var wide =
          c >= 0x1100 &&
          (c <= 0x115f ||
            (c >= 0x2e80 && c <= 0xa4cf) ||
            (c >= 0xac00 && c <= 0xd7a3) ||
            (c >= 0xf900 && c <= 0xfaff) ||
            (c >= 0xfe30 && c <= 0xfe4f) ||
            (c >= 0xff00 && c <= 0xff60) ||
            (c >= 0xffe0 && c <= 0xffe6))
        w += wide ? 2 : 1
      }
      return w
    }
    function overDesc(list) {
      return (list || []).filter(function (s) { return descWidth(s.description || '') > DESC_MAX })
    }

    function shortStem(name) {
      return String(name || '').replace(/^\d+-/, '')
    }

    function readJson(res) {
      return res.text().then(function (text) {
        var data
        try {
          data = text ? JSON.parse(text) : {}
        } catch (err) {
          throw new Error('接口返回不是 JSON（HTTP ' + res.status + '）：' + String(text).slice(0, 120))
        }
        if (!res.ok) throw new Error((data && data.error) || ('HTTP ' + res.status))
        return data
      })
    }

    var COLLAPSE_KEY = 'dsh-skill-order-collapsed'
    var GROUPS = [
      { id: 'user', title: '用户技能（~/.dsh/skills）', hint: '可排序 · 可改名' },
      { id: 'custom', title: '自定义目录', hint: '可排序' },
      { id: 'bundled', title: '系统内置', hint: '只读' },
      { id: 'provider', title: '由插件提供', hint: '不可排序' },
    ]
    function readCollapsed() {
      try {
        var raw = window.localStorage && window.localStorage.getItem(COLLAPSE_KEY)
        var parsed = raw ? JSON.parse(raw) : null
        return parsed && typeof parsed === 'object' ? parsed : {}
      } catch (e) {
        return {}
      }
    }

    function SkillOrderPage() {
      var _skills = useState([])
      var skills = _skills[0]
      var setSkills = _skills[1]
      var _loading = useState(true)
      var loading = _loading[0]
      var setLoading = _loading[1]
      var _busy = useState(false)
      var busy = _busy[0]
      var setBusy = _busy[1]
      var _status = useState('')
      var status = _status[0]
      var setStatus = _status[1]
      var _error = useState('')
      var error = _error[0]
      var setError = _error[1]
      var _drop = useState(null)
      var drop = _drop[0]
      var setDrop = _drop[1]
      var _notice = useState('')
      var notice = _notice[0]
      var setNotice = _notice[1]
      var dragRef = useRef(-1)
      var original = useRef([])
      var listRef = useRef(null)
      var rootRef = useRef(null)
      var hostRef = useRef(null)
      var savedDocOverflow = ''
      var stampRef = useRef('')
      var dirtyRef = useRef(false)
      var _edit = useState('')
      var editId = _edit[0]
      var setEditId = _edit[1]
      var _editValue = useState('')
      var editValue = _editValue[0]
      var setEditValue = _editValue[1]
      var _fresh = useState([])
      var fresh = _fresh[0]
      var setFresh = _fresh[1]
      var _lang = useState(initialLang())
      var lang = _lang[0]
      var setLang = _lang[1]
      LANG = lang
      function switchLang() {
        var next = LANG === 'zh' ? 'en' : 'zh'
        LANG = next
        setLang(next)
        try {
          if (window.localStorage) window.localStorage.setItem('dsh-skill-order-lang', next)
        } catch (error) {}
      }
      var _ops = useState({ autoPopup: true, autoPinNew: true })
      var ops = _ops[0]
      var setOps = _ops[1]
      var _extras = useState([])
      var extras = _extras[0]
      var setExtras = _extras[1]
      var _collapsed = useState(readCollapsed())
      var collapsed = _collapsed[0]
      var setCollapsed = _collapsed[1]
      var skillsRef = useRef([])
      skillsRef.current = skills

      function load(silent) {
        if (!silent) {
          setLoading(true)
          setError('')
          setStatus('')
          setNotice('')
        }
        // 一次拿齐「新技能清单 + 两个开关」和「当前列表」，再一次性把新技能排到最前。
        // 分成两个独立请求会打架：谁先回来谁说了算，/fresh 先到时的排序会被 /list 覆盖掉。
        Promise.all([
          fetch(API + '/fresh', { credentials: 'same-origin' })
            .then(readJson)
            .catch(function () { return null }),
          fetch(API + '/list', { credentials: 'same-origin' }).then(readJson),
        ])
          .then(function (res) {
            var meta = res[0]
            var data = res[1]
            if (!data || data.ok !== true) throw new Error((data && data.error) || '读取失败')
            var freshList = meta && Array.isArray(meta.fresh) ? meta.fresh : []
            var pinNew = !meta || !meta.settings || meta.settings.autoPinNew !== false
            setFresh(freshList)
            if (meta && meta.settings) {
              setOps({
                autoPopup: meta.settings.autoPopup !== false,
                autoPinNew: meta.settings.autoPinNew !== false,
              })
            }
            var serverList = Array.isArray(data.skills) ? data.skills : []
            var list = serverList
            if (freshList.length && pinNew) {
              var want = {}
              freshList.forEach(function (name) { want[name] = true })
              var head = []
              var rest = []
              list.forEach(function (s) { (want[s.dirName] ? head : rest).push(s) })
              head.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0 })
              if (head.length) list = head.concat(rest)
            }
            setSkills(list)
            setExtras(Array.isArray(data.extras) ? data.extras : [])
            // 比对基准必须是「磁盘上的顺序」（serverList），不能是排好新技能后的展示顺序：
            // 否则新技能已经置顶、dirty 却是 false，「应用」一直灰着，点了也没反应。
            original.current = serverList.map(function (s) { return s.id })
            stampRef.current = data.stamp || ''
            setNotice('')
          })
          .catch(function (err) {
            if (!silent) setError(String(err.message || err))
          })
          .finally(function () { if (!silent) setLoading(false) })
      }

      // 通知宿主丢掉技能缓存并让斜杠菜单重新拉一次，这样手动新建/改名也能当场生效。
      function notifyHost() {
        return fetch(API + '/refresh', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        })
          .then(readJson)
          .catch(function () { return null })
      }
      useEffect(function () {
        ensureStyle()
        load()
      }, [])

      // 宿主把设置页放在一个可滚动容器里，我们自己又滚列表 → 出现两条滚动条。
      // 量出宿主容器能给的高度，把根节点钉成这个高度，外层就不再滚，只剩列表滚。
      useEffect(function () {
        function findHost(node) {
          var p = node && node.parentElement
          while (p) {
            var cs = window.getComputedStyle(p)
            var scrollable = /(auto|scroll|overlay)/.test(cs.overflowY)
            if (scrollable && p.scrollHeight > p.clientHeight + 1) return p
            p = p.parentElement
          }
          return null
        }
        function fit() {
          var root = rootRef.current
          if (!root) return
          if (!hostRef.current) hostRef.current = findHost(root)
          var host = hostRef.current
          if (!host || !host.isConnected) {
            hostRef.current = null
            root.removeAttribute('data-fit')
            root.style.height = ''
            return
          }
          var top = root.getBoundingClientRect().top - host.getBoundingClientRect().top
          var cs = window.getComputedStyle(host)
          var padBottom = parseFloat(cs.paddingBottom) || 0
          var height = Math.max(260, host.clientHeight - top - padBottom - 2)
          root.setAttribute('data-fit', '1')
          root.style.height = height + 'px'
          // 亚像素/边框导致的残余溢出：按差值再收一次，直到宿主不再溢出
          for (var i = 0; i < 3; i += 1) {
            var over = host.scrollHeight - host.clientHeight
            if (over <= 0) break
            height = Math.max(200, height - over - 1)
            root.style.height = height + 'px'
          }
          // 还有一种是「文档本身」在滚：内容虽没溢出宿主，却把整页顶高。
          // 面板是弹出层，这段时间把文档滚动条藏起来，关掉时还原。
          var doc = document.scrollingElement || document.documentElement
          if (doc && doc.scrollHeight > doc.clientHeight + 1 && !savedDocOverflow) {
            savedDocOverflow = doc.style.overflowY || ''
            doc.style.overflowY = 'hidden'
          }
        }
        fit()
        window.addEventListener('resize', fit)
        var observer = window.ResizeObserver ? new window.ResizeObserver(fit) : null
        if (observer && rootRef.current && rootRef.current.parentElement) observer.observe(rootRef.current.parentElement)
        return function () {
          window.removeEventListener('resize', fit)
          if (observer) observer.disconnect()
          var doc = document.scrollingElement || document.documentElement
          if (doc && savedDocOverflow !== '') {
            doc.style.overflowY = savedDocOverflow
            savedDocOverflow = ''
          }
        }
      }, [loading, skills.length])

      function toggleGroup(id) {
        var next = {}
        for (var key in collapsed) next[key] = collapsed[key]
        next[id] = !isOpen(id)
        setCollapsed(next)
        try {
          if (window.localStorage) window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
        } catch (e) {}
      }
      function isOpen(id) {
        if (collapsed && Object.prototype.hasOwnProperty.call(collapsed, id)) return !!collapsed[id]
        return id === 'user'
      }
      function groupOfLocal(skill) {
        return skill && skill.source === 'superpowers' ? 'custom' : 'user'
      }

      var dirty = skills.some(function (s, i) { return s.id !== original.current[i] })
      dirtyRef.current = dirty

      function saveOps(next) {
        setOps(next)
        fetch(API + '/settings', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify(next),
        }).catch(function () {})
      }

      // 页面显示期间每 2 秒比对一次目录指纹；变了就重新拉列表。
      // 用户已经拖过但没点「应用」时不覆盖，只提示。
      useEffect(function () {
        var alive = true
        var timer = null

        function check() {
          fetch(API + '/stamp', { credentials: 'same-origin' })
            .then(readJson)
            .then(function (data) {
              if (!alive || !data || data.ok !== true) return
              if (!stampRef.current || data.stamp === stampRef.current) return
              if (dirtyRef.current) {
                setNotice('磁盘上的技能有变化，点「刷新」查看')
                return
              }
              load(true)
            })
            .catch(function () {})
        }

        function tick() {
          if (!alive) return
          if (typeof document !== 'undefined' && document.hidden) {
            timer = setTimeout(tick, 2000)
            return
          }
          check()
          timer = setTimeout(tick, 2000)
        }

        function onVisible() {
          if (typeof document !== 'undefined' && document.hidden) return
          check()
        }

        timer = setTimeout(tick, 2000)
        if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible)
        if (typeof window !== 'undefined') window.addEventListener('focus', onVisible)

        return function () {
          alive = false
          if (timer) clearTimeout(timer)
          if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible)
          if (typeof window !== 'undefined') window.removeEventListener('focus', onVisible)
        }
      }, [])

      // target 是「移出前」的插入位置
      function moveTo(from, target) {
        if (from < 0 || target < 0) return
        if (from === target || from === target - 1) return
        setSkills(function (prev) {
          var next = prev.slice()
          var item = next.splice(from, 1)[0]
          next.splice(target > from ? target - 1 : target, 0, item)
          return next
        })
      }

      // 被搬动的行如果还持有焦点，浏览器会把它滚进视野，表现就是整页跳回顶部。
      // 所以先找真正在滚动的祖先容器，记下位置，失焦，搬完再还原。
      function scrollerOf(el) {
        var node = el
        while (node && node.nodeType === 1) {
          var oy = window.getComputedStyle(node).overflowY
          if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && node.scrollHeight > node.clientHeight + 1) {
            return node
          }
          node = node.parentElement
        }
        return null
      }

      // 送到「本组第 1 位」：跨组时不越界，否则会把另一个组的技能挤到前面
      function groupStart(index) {
        var list = skillsRef.current || []
        var self = list[index]
        if (!self) return index
        var key = groupOfLocal(self)
        for (var i = 0; i < list.length; i += 1) {
          if (groupOfLocal(list[i]) === key) return i
        }
        return index
      }

      function pinToTop(index) {
        var top = groupStart(index)
        if (index <= top) return
        var scroller = listRef.current ? scrollerOf(listRef.current) : null
        var savedTop = scroller ? scroller.scrollTop : window.scrollY
        var active = document.activeElement
        if (active && active !== document.body && typeof active.blur === 'function') active.blur()
        moveTo(index, top)
        function restore() {
          if (scroller) {
            if (scroller.scrollTop !== savedTop) scroller.scrollTop = savedTop
          } else if (window.scrollY !== savedTop) {
            window.scrollTo(window.scrollX || 0, savedTop)
          }
        }
        requestAnimationFrame(function () {
          restore()
          requestAnimationFrame(restore)
        })
      }

      function onDragStart(index, event) {
        dragRef.current = index
        try {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', String(index))
        } catch (e) {}
      }

      function onDragOver(index, event) {
        event.preventDefault()
        var rect = event.currentTarget.getBoundingClientRect()
        var after = event.clientY - rect.top > rect.height / 2
        if (!drop || drop.index !== index || drop.after !== after) {
          setDrop({ index: index, after: after })
        }
      }

      function onDrop(index, event) {
        event.preventDefault()
        var from = dragRef.current
        var rect = event.currentTarget.getBoundingClientRect()
        var after = event.clientY - rect.top > rect.height / 2
        // 只在同一组里排：跨组拖动没意义，还会把两组的编号搅在一起
        if (from >= 0 && skillsRef.current[from] && skillsRef.current[index]) {
          if (groupOfLocal(skillsRef.current[from]) === groupOfLocal(skillsRef.current[index])) {
            moveTo(from, after ? index + 1 : index)
          }
        }
        dragRef.current = -1
        setDrop(null)
      }

      function onDragEnd() {
        dragRef.current = -1
        setDrop(null)
      }

      function startEdit(skill) {
        if (busy || loading) return
        setError('')
        setStatus('')
        setNotice('')
        setEditId(skill.id)
        setEditValue(stemOf(skill.name))
      }

      function cancelEdit() {
        setEditId('')
        setEditValue('')
      }

      function submitRename(skill) {
        if (!skill || busy) return
        var problem = stemProblem(editValue, skills, skill.id)
        if (problem) {
          setError(problem)
          return
        }
        var stem = String(editValue).trim()
        if (stem === stemOf(skill.name)) {
          cancelEdit()
          return
        }
        setBusy(true)
        setError('')
        setStatus('')
        fetch(API + '/rename', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ source: skill.source, dirName: skill.dirName, stem: stem }),
        })
          .then(readJson)
          .then(function (data) {
            if (!data || data.ok !== true) throw new Error((data && data.error) || '改名失败')
            setEditId('')
            setEditValue('')
            setStatus('已改名为 ' + data.to)
            return load(true)
          })
          .catch(function (err) {
            setError(String(err.message || err))
          })
          .finally(function () { setBusy(false) })
      }

      function applyOrder() {
        if (!dirty || busy) return
        var over = overDesc(skills)
        if (over.length && !window.confirm(t('还有 ' + over.length + ' 个技能的简介超过 20 个字（列表里标了「超 N」），仍要应用吗？'))) return
        setBusy(true)
        setError('')
        setStatus('')
        fetch(API + '/apply', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ order: skills.map(function (s) { return s.id }) }),
        })
          .then(readJson)
          .then(function (data) {
            if (!data || data.ok !== true) throw new Error((data && data.error) || '应用失败')
            var list = Array.isArray(data.renamed) ? data.renamed : []
            var head = '已改 ' + list.length + ' 项'
            setStatus(head + '，正在同步斜杠菜单…')
            // 不等后台每 2 秒的指纹轮询，点完就通知宿主清缓存 + 广播会话
            return notifyHost().then(function (res) {
              if (res && res.reload === 'pending') {
                setStatus(head + '，插件代码也有更新，正在重载，几秒后按 F5 刷新本窗口即可用上新代码。')
                load(true)
                return
              }
              var steps = res && Array.isArray(res.refresh) ? res.refresh : []
              var done = steps.indexOf('skills.invalidateCache') >= 0
              setStatus(done ? head + '，斜杠菜单已同步。' : head + '。斜杠菜单会在一两秒内自动同步。')
              load(true)
            })
          })
          .catch(function (err) {
            setError(String(err.message || err))
          })
          .finally(function () { setBusy(false) })
      }

      function rowOf(skill, index) {
            var preview = pad2(index + 1, skills.length) + '-' + stemOf(skill.name)
            var editing = editId === skill.id
            var problem = editing ? stemProblem(editValue, skills, skill.id) : ''
            var cls = 'dso-item'
            if (editing) cls += ' editing'
            if (drop) {
              if (drop.index === index) cls += drop.after ? ' drop-after' : ' drop-before'
              else if (drop.index === index - 1 && drop.after) cls += ' drop-before'
            }
            return h('li', {
              key: skill.id,
              className: cls,
              draggable: !editing,
              onDragStart: function (event) { onDragStart(index, event) },
              onDragOver: function (event) { onDragOver(index, event) },
              onDrop: function (event) { onDrop(index, event) },
              onDragEnd: onDragEnd,
            },
              h('span', { className: 'dso-handle', title: editing ? t('改完才能拖动') : t('按住拖动排序') }, iconGrip()),
              h('span', { className: 'dso-idx' }, pad2(index + 1, skills.length)),
              editing
                ? h('div', { className: 'dso-edit' },
                  h('input', {
                    value: editValue,
                    autoFocus: true,
                    spellCheck: false,
                    className: problem ? 'bad' : '',
                    'aria-label': '新名字',
                    onChange: function (event) { setEditValue(event.target.value) },
                    onKeyDown: function (event) {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        submitRename(skill)
                      } else if (event.key === 'Escape') {
                        event.preventDefault()
                        cancelEdit()
                      }
                    },
                  }),
                  h('span', { className: 'dso-hint' }, problem || '回车确定，Esc 取消'),
                  h('button', {
                    className: 'dso-btn primary',
                    type: 'button',
                    disabled: !!problem || busy,
                    onClick: function () { submitRename(skill) },
                  }, '确定'),
                  h('button', {
                    className: 'dso-btn',
                    type: 'button',
                    disabled: busy,
                    onClick: cancelEdit,
                  }, '取消')
                )
                : h('div', { className: 'dso-main' },
                  h('div', { className: 'dso-name' }, preview),
                  h('div', {
                    className: 'dso-desc' + (descWidth(skill.description) > DESC_MAX ? ' over' : ''),
                    title: (skill.description || skill.name) + t('\n简介宽度 ' + descWidth(skill.description) + ' / 上限 ' + DESC_MAX),
                  }, skill.description || skill.name)
                ),
              descWidth(skill.description) > DESC_MAX
                ? h('span', { className: 'dso-over', title: '简介超过 20 个字，建议改短' }, '超 ' + (descWidth(skill.description) - DESC_MAX))
                : null,
              h('span', { className: 'dso-tag' }, sourceLabel(skill.source)),
              editing ? null : h('button', {
                className: 'dso-pen',
                type: 'button',
                title: t('改名字'),
                'aria-label': t('改名字'),
                disabled: busy || loading,
                onClick: function () { startEdit(skill) },
              }, iconPencil()),
              h('button', {
                className: 'dso-pin',
                type: 'button',
                title: index === 0 ? t('已经在第 1 位') : t('移到第 1 位'),
                'aria-label': t('移到第 1 位'),
                disabled: index === 0 || busy || loading || editing,
                onClick: function () { pinToTop(index) },
              }, iconToTop())
            )
      }

      function extraRow(item) {
        return h('li', { key: item.id, className: 'dso-item readonly' },
          h('span', { className: 'dso-handle', title: t('由插件提供，不能排序') }, iconGrip()),
          h('span', { className: 'dso-idx' }, '–'),
          h('div', { className: 'dso-main' },
            h('div', { className: 'dso-name' }, item.name),
            h('div', { className: 'dso-desc', title: item.description || item.name }, item.description || item.name)
          ),
          h('span', { className: 'dso-tag prov' }, t('由插件提供'))
        )
      }

      function buildSections() {
        var byGroup = { user: [], custom: [] }
        skills.forEach(function (skill, index) {
          var key = groupOfLocal(skill)
          byGroup[key] = byGroup[key] || []
          byGroup[key].push({ skill: skill, index: index })
        })
        var extraBy = { user: [], custom: [], bundled: [], provider: [] }
        extras.forEach(function (item) {
          if (!extraBy[item.group]) extraBy[item.group] = []
          extraBy[item.group].push(item)
        })
        return GROUPS.map(function (group) {
          var locals = byGroup[group.id] || []
          var others = extraBy[group.id] || []
          var count = locals.length + others.length
          if (!count) return null
          var open = isOpen(group.id)
          return h('section', { key: 'g-' + group.id, className: 'dso-group' },
            h('button', {
              type: 'button',
              className: 'dso-ghead',
              'aria-expanded': open ? 'true' : 'false',
              onClick: function () { toggleGroup(group.id) },
            },
              h('span', { className: 'dso-caret' }, open ? '▾' : '▸'),
              h('span', { className: 'dso-gname' }, t(group.title)),
              h('span', { className: 'dso-gcnt' }, count + ' 个'),
              h('span', { className: 'dso-gtag' }, t(group.hint))
            ),
            open
              ? h('ul', { className: 'dso-list' },
                  locals.map(function (entry) { return rowOf(entry.skill, entry.index) })
                    .concat(others.map(extraRow))
                )
              : null
          )
        })
      }

      return h('div', { className: 'dso', ref: rootRef },
        h('h2', null, '技能排序'),
        h('div', { className: 'dso-note' },
          '按来源分组：能拖动的那些会改文件夹名；点右侧「↥」直接送到本组第 1 位，铅笔可以改名字（只用小写英文、数字和连字符）。点「应用」才会真正改磁盘，斜杠菜单按这个顺序排。'
        ),
        h('div', { className: 'dso-warn' },
          '带「升级包」标记的是 superpowers，升级那个插件时文件夹名会被盖回去，到时需要再排一次。由插件提供的技能不在这份清单里排序，挪不动。'
        ),
        fresh.length && ops.autoPopup
          ? h('div', { className: 'dso-fresh' },
              h('div', null,
                h('b', null, '发现 ' + fresh.length + ' 个新技能'),
                h('span', { className: 'dso-note' },
                  '，已按名字排到最前：' +
                    fresh.slice(0, 3).map(shortStem).join('、') +
                    (fresh.length > 3 ? ' 等' : '') +
                    '。确认没问题再点「应用」，不点不会改磁盘。'
                )
              ),
              h('button', { className: 'dso-btn', onClick: function () { setFresh([]) } }, '知道了')
            )
          : null,
        h('div', { className: 'dso-ops' },
          h('label', { className: 'dso-op' },
            h('input', {
              type: 'checkbox',
              checked: !!ops.autoPopup,
              onChange: function (e) { saveOps({ autoPopup: e.target.checked, autoPinNew: !!ops.autoPinNew }) },
            }),
            '发现新技能时在页面顶部提示'
          ),
          h('label', { className: 'dso-op' },
            h('input', {
              type: 'checkbox',
              checked: !!ops.autoPinNew,
              onChange: function (e) { saveOps({ autoPopup: !!ops.autoPopup, autoPinNew: e.target.checked }) },
            }),
            '新技能按名字排到最前'
          )
        ),
        h('div', { className: 'dso-bar' },
          h('button', {
            className: 'dso-btn primary',
            disabled: !dirty || busy || loading,
            onClick: applyOrder,
          }, busy ? '正在改名…' : '应用'),
          h('button', {
            className: 'dso-btn',
            disabled: busy || loading,
            onClick: function () {
              if (dirty && !window.confirm(t('当前排序还没点「应用」，刷新会丢掉这些调整。继续？'))) return
              notifyHost().then(function () { load() })
            },
          }, '刷新'),
          h('span', { className: 'dso-count' },
            loading ? '读取中…' : ('共 ' + (skills.length + extras.length) + ' 个 · 可排序 ' + skills.length + ' · 由插件提供 ' + extras.filter(function (x) { return x.group === 'provider' }).length)
          ),
          h('button', {
            className: 'dso-btn',
            type: 'button',
            onClick: switchLang,
            title: LANG === 'zh' ? 'Switch panel to English' : 'Switch to Chinese',
          }, LANG === 'zh' ? 'EN' : '中文')
        ),
        error ? h('div', { className: 'dso-status err' }, error) : null,
        notice ? h('div', { className: 'dso-status warn' }, notice) : null,
        status ? h('div', { className: 'dso-status ok' }, status) : null,
        h('div', { className: 'dso-groups', ref: listRef }, buildSections())
      )
    }

    function SkillOrderIcon() {
      return h('svg', {
        width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.5,
        strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': 'true',
      },
        h('path', { d: 'M3 4.2h8' }),
        h('path', { d: 'M3 8h10' }),
        h('path', { d: 'M3 11.8h6' })
      )
    }

    function PanelShell() {
      return h('div', { className: 'dso-main' }, h(SkillOrderPage))
    }

    function apply(ctx) {
      var slots = ctx.slots
      if (!slots) return
      ctx.effect(function () {
        var disposers = []
        disposers.push(slots.inject('sidebar.panellist', function () {
          return slots.register({
            name: 'sidebar.panellist',
            id: 'skill-order',
            order: 34,
            label: function () { return t('技能排序') },
          }, SkillOrderIcon)
        }))
        disposers.push(slots.inject('main', function () {
          return slots.register({ name: 'main', key: 'skill-order' }, PanelShell)
        }))
        return function () {
          disposers.forEach(function (dispose) {
            if (typeof dispose === 'function') dispose()
          })
        }
      }, 'dsh-skill-order: panel')
    }

    exports.name = 'dsh-skill-order'
    exports.inject = ['slots']
    exports.apply = apply
    return module.exports
  },
})
