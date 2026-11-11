window.__ModuleLoader__.load({
  id: 'dsh-skill-order',
  factory: function (require) {
    var module = { exports: {} }
    var exports = module.exports
    var React = require('react')
    var h = React.createElement
    var useState = React.useState
    var useEffect = React.useEffect
    var useRef = React.useRef

    var API = '/api/dsh-skill-order'
    var STYLE_ID = 'dsh-skill-order-style'

    var CSS = [
      '.dso{display:flex;flex-direction:column;gap:10px;padding:4px 0 12px;max-width:760px;',
      'font-size:13px;line-height:1.55;color:var(--dsw-alias-label-primary,#1f2328);}',
      '.dso h2{margin:0;font-size:16px;font-weight:650;color:var(--dsw-alias-label-primary,#1f2328);}',
      '.dso-note,.dso-status{font-size:12px;color:var(--dsw-alias-label-secondary,#68717d);}',
      '.dso-warn{font-size:12px;color:var(--dsw-alias-state-warn-primary,#a86400);}',
      '.dso-status.err{color:var(--dsw-alias-state-error-primary,#d64545);}',
      '.dso-status.ok{color:var(--dsw-alias-state-success-primary,#1a7f37);}',
      '.dso-status.warn{color:var(--dsw-alias-state-warn-primary,#b25e09);}',
      '.dso-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:2px;}',
      '.dso-btn{height:32px;padding:0 14px;border-radius:var(--dsw-radius-sm,8px);',
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
      '.dso-list{list-style:none;margin:0;padding:0;overflow:hidden;',
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
      '.dso-changed{border:.5px solid var(--dsw-alias-border-l2,#e3e6ea);border-radius:8px;padding:8px 10px;margin:8px 0;background:var(--dsw-alias-bg-layer-2,transparent);}',
      '.dso-changed-head{display:flex;align-items:center;gap:8px;margin-bottom:6px;}',
      '.dso-changed-head .dso-note{flex:1;}',
      '.dso-changed-list{margin:0;padding:0;list-style:none;max-height:180px;overflow:auto;font-size:12px;}',
      '.dso-changed-list li{display:flex;align-items:center;gap:6px;padding:2px 0;}',
      '.dso-changed-list code{font-family:ui-monospace,Consolas,monospace;font-size:12px;}',
      '.dso-changed-list .dso-new{color:var(--dsw-alias-brand-primary,#4176e6);}',
      '.dso-arrow{color:var(--dsw-alias-label-tertiary,#8b929c);}',
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
      var stampRef = useRef('')
      var dirtyRef = useRef(false)
      var _edit = useState('')
      var editId = _edit[0]
      var setEditId = _edit[1]
      var _editValue = useState('')
      var editValue = _editValue[0]
      var setEditValue = _editValue[1]
      var _renamed = useState([])
      var renamedList = _renamed[0]
      var setRenamedList = _renamed[1]

      function load(silent) {
        if (!silent) {
          setLoading(true)
          setError('')
          setStatus('')
          setNotice('')
        }
        fetch(API + '/list', { credentials: 'same-origin' })
          .then(readJson)
          .then(function (data) {
            if (!data || data.ok !== true) throw new Error((data && data.error) || '读取失败')
            var list = Array.isArray(data.skills) ? data.skills : []
            setSkills(list)
            original.current = list.map(function (s) { return s.id })
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

      var dirty = skills.some(function (s, i) { return s.id !== original.current[i] })
      dirtyRef.current = dirty

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

      function pinToTop(index) {
        if (index <= 0) return
        var scroller = listRef.current ? scrollerOf(listRef.current) : null
        var savedTop = scroller ? scroller.scrollTop : window.scrollY
        var active = document.activeElement
        if (active && active !== document.body && typeof active.blur === 'function') active.blur()
        moveTo(index, 0)
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
        var rect = event.currentTarget.getBoundingClientRect()
        var after = event.clientY - rect.top > rect.height / 2
        moveTo(dragRef.current, after ? index + 1 : index)
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
            setRenamedList(list)
            setStatus('已改 ' + list.length + ' 项。重启软件后，斜杠菜单会按这个顺序排。')
            load(true)
          })
          .catch(function (err) {
            setError(String(err.message || err))
          })
          .finally(function () { setBusy(false) })
      }

      function copyRenamed() {
        var text = renamedList.map(function (item) { return '/' + item.to }).join('\n')
        try {
          navigator.clipboard.writeText(text).then(function () {
            setStatus('新命令已复制，一行一个。')
          }, function () {
            setError('复制失败，请手动选中复制')
          })
        } catch (err) {
          setError('复制失败，请手动选中复制')
        }
      }

      return h('div', { className: 'dso' },
        h('h2', null, '技能排序'),
        h('div', { className: 'dso-note' },
          '拖动条目排出顺序；点右侧图标把该条直接送到第 1 位，其余依次下移一位。铅笔图标可以改这条技能的名字（只用小写英文、数字和连字符）。点「应用」才会真正改文件夹名和技能文件里的名字，斜杠菜单按这个顺序排。'
        ),
        h('div', { className: 'dso-warn' },
          '带「升级包」标记的是 superpowers，升级那个插件时文件夹名会被盖回去，到时需要再排一次。软件自带的 8 个技能不在这个列表里。'
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
              if (dirty && !window.confirm('当前排序还没点「应用」，刷新会丢掉这些调整。继续？')) return
              notifyHost().then(function () { load() })
            },
          }, '刷新'),
          h('span', { className: 'dso-count' }, loading ? '读取中…' : ('共 ' + skills.length + ' 个'))
        ),
        error ? h('div', { className: 'dso-status err' }, error) : null,
        notice ? h('div', { className: 'dso-status warn' }, notice) : null,
        status ? h('div', { className: 'dso-status ok' }, status) : null,
        renamedList.length ? h('div', { className: 'dso-changed' },
          h('div', { className: 'dso-changed-head' },
            h('b', null, renamedList.length + ' 个命令名变了'),
            h('span', { className: 'dso-note' }, '以后用右边的新名字调用'),
            h('button', { className: 'dso-btn', onClick: copyRenamed }, '复制新命令')
          ),
          h('ul', { className: 'dso-changed-list' },
            renamedList.map(function (item) {
              return h('li', { key: item.id + '>' + item.to },
                h('code', null, '/' + item.from),
                h('span', { className: 'dso-arrow' }, '→'),
                h('code', { className: 'dso-new' }, '/' + item.to)
              )
            })
          )
        ) : null,
        h('ul', { className: 'dso-list', ref: listRef },
          skills.map(function (skill, index) {
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
              h('span', { className: 'dso-handle', title: editing ? '改完才能拖动' : '按住拖动排序' }, iconGrip()),
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
                  h('div', { className: 'dso-desc', title: skill.description || skill.name },
                    skill.description || skill.name)
                ),
              h('span', { className: 'dso-tag' }, sourceLabel(skill.source)),
              editing ? null : h('button', {
                className: 'dso-pen',
                type: 'button',
                title: '改名字',
                'aria-label': '改名字',
                disabled: busy || loading,
                onClick: function () { startEdit(skill) },
              }, iconPencil()),
              h('button', {
                className: 'dso-pin',
                type: 'button',
                title: index === 0 ? '已经在第 1 位' : '移到第 1 位',
                'aria-label': '移到第 1 位',
                disabled: index === 0 || busy || loading || editing,
                onClick: function () { pinToTop(index) },
              }, iconToTop())
            )
          })
        )
      )
    }

    function apply(ctx) {
      var slots = ctx.slots
      if (!slots) return
      ctx.effect(function () {
        var dispose = slots.inject('settings.section', function () {
          return slots.register({
            name: 'settings.section',
            id: 'dsh-skill-order',
            order: 28,
            label: '技能排序',
            icon: 'skill',
          }, SkillOrderPage)
        })
        return function () {
          if (typeof dispose === 'function') dispose()
        }
      }, 'dsh-skill-order: settings')
    }

    exports.name = 'dsh-skill-order'
    exports.inject = ['slots']
    exports.apply = apply
    return module.exports
  },
})
