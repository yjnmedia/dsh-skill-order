# dsh-skill-order

DSH 设置页里的「技能排序」插件，当前版本 **1.0.9**。

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

## 自动规范新技能（1.0.12）

后台每 2 秒比一次技能目录指纹。发现新技能时（不管是谁放进来的）：

- 名字不合「两位编号-英文词干」的，自动补编号并清洗词干：去掉 `mem-skill-` 前缀与尾部哈希，非法字符转连字符；已经合规的不动。
- 简介超过 20 个汉字（显示宽度 40）的，调用一次模型改写到 20 字以内；模型给不出合格结果时保留原文并记账，不硬截断。
- 处理结果写进 `%USERPROFILE%\.dsh\dsh-skill-order.json` 的 `knownSkills` 快照，重启后不会重复处理同一批。
- 设置页顶部显示「发现 N 个新技能」，并按名字把它们排到最前；顺序只存在页面里，点「应用」才改磁盘。
- 被识别出来的新技能同时记进同一文件的 `pendingNew`（1.0.14 起）：刷新页面、重载插件、重启软件都还认得出来，直到你点「应用」才清空。1.0.12 把它放在内存里，一次重载就丢，表现就是「提示条出来了但没排到最前」。

同一配置文件里有两个开关：`autoPopup` 管提示条，`autoPinNew` 管自动排到最前。

宿主没有公开接口能让插件主动打开设置页（60 个客户端包里都没有），所以这条提示只在用户打开「设置 → 技能排序」时出现。

## 待确认的新技能是持久状态（1.0.14）

1.0.12 把「刚收进来的新技能」放在内存里，重载一次插件就没了 —— 提示条还在，但那条技能已经重新落回原位，看着就是「功能没生效」。

1.0.14 改为写进配置文件的 `pendingNew`：

- 后台自动规范时，把规范后的技能 id 追加进 `pendingNew`。
- `/api/dsh-skill-order/fresh` 从 `pendingNew` 里取值，再和磁盘现状求交，已经删掉或改名的自动作废。
- 点「应用」成功后才清空；不点就一直待在最前。
- 刷新页面、重载插件、重启软件都保持。

## 刷新顺带重载（1.0.13）

点「刷新」时，先比一次插件自己那几个源码文件的指纹（`package.json` 与 `lib/*.js` 的 mtime + size）。只有比出来不一致——也就是磁盘上已经换了一版、而进程里跑的还是旧的——才会在响应发出去之后调一次 `pluginManager.reload()`，让宿主重新组合 profile。平时点刷新跟以前一样，不会重载。

- 不会在后台轮询：重载会把整个 profile 短暂重挂，不能随手触发。
- 响应先发、重载后做，否则请求会被自己切断。
- 宿主没挂 `pluginManager` 时返回 `reload: "unavailable"`，界面照常提示，只是要等下次重启。
- 只换后端代码；界面部分（`lib/client.js`）仍需按 F5 刷新窗口。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/dsh-skill-order/list` | 返回 `{ ok, skills, count, stamp }` |
| GET | `/api/dsh-skill-order/stamp` | 返回 `{ ok, stamp }`，客户端每 2 秒比对一次 |
| POST | `/api/dsh-skill-order/apply` | 请求体 `{ order: [id, ...] }`，按顺序改名 |
| POST | `/api/dsh-skill-order/refresh` | 让宿主丢掉技能缓存并通知界面重取；插件代码有变化时顺带重载，返回 `{ ok, refresh, reload }` |
| POST | `/api/dsh-skill-order/rename` | 请求体 `{ source, dirName, stem }`，只换词干，位置编号不动 |

后台还有一个不对外暴露的轮询：每 2 秒比一次技能目录指纹（`createSkillWatcher`），发现变化就让宿主丢掉技能缓存。它是替别的不发通知的工具补位 —— 例如技能中心 `@linxin666/dsh-client-ui-skill-explorer` 读写同一批目录，但全包没有 `emit` / `invalidateCache`，它改完技能，斜杠菜单靠这里才活得过来。只通知宿主，不重拉列表、不动正在拖的顺序。

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

Node 26 下写 `node --test test/` 会报 `MODULE_NOT_FOUND`，必须带 `*.test.js` 通配。当前 20 个用例全过。

## 已知约束

- 技能名只允许小写字母、数字、连字符（`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`）。大写字母会让技能失效，`/` 菜单里调不出来，所以不能用驼峰命名。
- `mem-skill-*` 开头的技能由记忆插件自动生成，手动改名会被它还原。
- 改名会同步改变 `/` 菜单里的命令名。
- 客户端脚本改动后要刷新页面，宿主重启才会重新读取。
