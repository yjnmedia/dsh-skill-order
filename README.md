# dsh-skill-order

DSH 设置页里的「技能排序」插件，当前版本 **1.0.3**。

拖拽调整顺序、点行末的 ↑ 一键置顶，点「应用」后同步改技能文件夹名和 `SKILL.md` 里的 `name`。斜杠菜单按 `name` 的码点排序，宿主没有单独的排序配置。

## 当前路径

源码在本目录：`E:\000Dev\TuoZiWorkbench\Yichajian\dsh-skill-order`

装进 DSH 走的是**本地链接**，三处必须一致，缺一处插件就加载不了：

| 位置 | 内容 |
| --- | --- |
| `C:\Users\Admin\.dsh\profiles\desktop\package.json` 第 13 行 | `"dsh-skill-order": "link:E:/000Dev/TuoZiWorkbench/Yichajian/dsh-skill-order"` |
| `C:\Users\Admin\.dsh\profiles\desktop\node_modules\dsh-skill-order` | Junction，指向上面这个源码目录 |
| 同一个 `package.json` 的 `dsh.profile.bundles` | 列表里要有 `dsh-skill-order` |

**搬动源码目录后必须重建 junction**，否则是一条悬空的断链，插件会静默不加载，设置页里也看不到。

重建命令（PowerShell）：

```powershell
$link = 'C:\Users\Admin\.dsh\profiles\desktop\node_modules\dsh-skill-order'
if (Test-Path -LiteralPath $link) { (Get-Item -LiteralPath $link -Force).Delete() }
New-Item -ItemType Junction -Path $link -Target 'E:\000Dev\TuoZiWorkbench\Yichajian\dsh-skill-order'
```

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/dsh-skill-order/list` | 返回 `{ ok, skills, count, stamp }` |
| GET | `/api/dsh-skill-order/stamp` | 返回 `{ ok, stamp }`，客户端每 2 秒比对一次 |
| POST | `/api/dsh-skill-order/apply` | 请求体 `{ order: [id, ...] }`，按顺序改名 |
| POST | `/api/dsh-skill-order/rename` | 请求体 `{ source, dirName, stem }`，只换词干，位置编号不动 |

只接受本机访问。宿主侧用 `ctx.webServer.register({ kind: 'exact' })` 挂载 —— **不能只挂 connection.fetch**，那条通道在端点未注册时返回纯文本 `not found`，前端 `JSON.parse` 会直接报错。

## 会改哪里

- `C:\Users\Admin\.dsh\skills`（本地技能）
- `C:\Users\Admin\.dsh\profiles\desktop\node_modules\superpowers-dsh\skills`（升级包技能，插件升级会被盖回去）
- 不改 asar 内置的 8 个技能，磁盘上没有它们独立的 `SKILL.md`

命名规则：两位编号 + `-` + 词干，例如 `01-handoff`。原有的数字前缀会先剥掉再重新编号，改名中途失败会回滚。

## 测试

```bash
node --test test/*.test.js
```

Node 26 下写 `node --test test/` 会报 `MODULE_NOT_FOUND`，必须带 `*.test.js` 通配。当前 19 个用例全过。

## 已知约束

- 技能名只允许小写字母、数字、连字符（`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`）。大写字母会让技能失效，`/` 菜单里调不出来，所以不能用驼峰命名。
- `mem-skill-*` 开头的技能由记忆插件自动生成，手动改名会被它还原。
- 改名会同步改变 `/` 菜单里的命令名。
- 客户端脚本改动后要刷新页面，宿主重启才会重新读取。
