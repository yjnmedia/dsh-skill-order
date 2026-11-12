# 开发与排障

给要改这个插件、或者装不上的人看。用户向的说明在 [README](../README.md)。

## 本机链接安装

改代码时不要走市场，直接链到源码目录。三处必须一致，缺一处插件就静默不加载：

| 位置 | 内容 |
| --- | --- |
| `<profile>/package.json` 的 `dependencies` | `"dsh-skill-order": "link:E:/000Dev/TuoZiWorkbench/Yichajian/dsh-skill-order"` |
| `<profile>/node_modules/dsh-skill-order` | Junction，指向上面的源码目录 |
| 同一个 `package.json` 的 `dsh.profile.bundles` | 列表里有 `dsh-skill-order` |

搬动源码目录后，必须用 `dsh plugin add` 重装一次：

```sh
dsh plugin --profile desktop add "E:\000Dev\TuoZiWorkbench\Yichajian\dsh-skill-order"
```

手改 `package.json` 或手工重建 junction 都会被 pnpm 按 lockfile 改回旧路径，插件从此加载失败。

## 插件没加载

按顺序查：

1. `~/.dsh/dsh-skill-order-ready.log` 有没有今天的行。没有 = `apply()` 没跑。
2. `node_modules/dsh-skill-order` 是不是悬空链接（指向已删除的目录）。
3. `<profile>/pnpm-lock.yaml` 里是不是还写着旧路径。
4. 设置页里没有「技能排序」这一项，但 `ready.log` 有：客户端脚本要按 F5 重载窗口。

## 接口

都只接受本机访问。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/dsh-skill-order/list` | `{ ok, skills, count, stamp }` |
| GET | `/api/dsh-skill-order/stamp` | `{ ok, stamp }`，客户端每 2 秒比对 |
| GET | `/api/dsh-skill-order/fresh` | `{ ok, settings, skills, fresh, stamp }`，待确认的新技能 |
| GET / POST | `/api/dsh-skill-order/settings` | 读写 `autoPopup`、`autoPinNew` |
| POST | `/api/dsh-skill-order/apply` | `{ order: [id, ...] }`，按顺序改名 |
| POST | `/api/dsh-skill-order/rename` | `{ source, dirName, stem }`，只换词干 |
| POST | `/api/dsh-skill-order/refresh` | 清宿主技能缓存并广播；插件代码变了顺带重载自己 |

宿主侧用 `ctx.webServer.register({ kind: 'exact' })` 挂载。**不能只挂 `connection.fetch`**：那条通道在端点未注册时返回纯文本 `not found`，前端 `JSON.parse` 会直接报错。

后台还有一个不对外暴露的轮询（`createSkillWatcher`，2 秒一次比 `skillStamp` 指纹），发现目录变化就调 `refreshSkillCatalog`。这是替不发通知的工具补位——技能中心 `@linxin666/dsh-client-ui-skill-explorer` 读写同一批目录，但整个包没有 `emit`、不调 `invalidateCache`，它改完技能，斜杠菜单靠这里才活得过来。

## 同步斜杠菜单的三步

只清缓存不够。`SkillService.invalidateCache()` 发的是 `skills/change`，而界面 `@deepseek-ai/dsh-client-ui-skill` 只监听 `agent-preset/selected`，技能目录按 `sessionId` 缓存在一个 Map 里。三步一起走才见效：

1. `ctx.skills.invalidateCache()`
2. `ctx.emit('commands/change')`
3. 逐个会话 `ctx.emit('agent-preset/selected', id, preset)`

## 重载自己

重载不能直接调 `pluginManager.reload()`。`dsh-hmr` 的 `reconcileProfile` 第一行会检查执行上下文，不在 `runExclusive` 里就抛 `HMR profile reconciliation must run inside runExclusive`；这个错误如果被 `catch` 吞掉，表现就是「返回了 pending 但什么都没发生」。正确写法：

```js
hmr.runExclusive(() => manager.reload())
```

还有两个约束：响应必须先发出去，否则请求会被自己切断；重载会短暂重挂整个 profile，不能后台轮询触发。

## 测试

```bash
node --test test/*.test.js
```

Node 26 下写 `node --test test/` 会报 `MODULE_NOT_FOUND`，必须带 `*.test.js` 通配。

## 已知约束

- 技能名只允许小写字母、数字、连字符（`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`）。大写或中文会让技能失效，`/` 菜单里调不出来。
- 改名会同步改变 `/` 菜单里的命令名。
- `mem-skill-*` 开头的技能由记忆插件自动生成，手动改名会被它还原。
- `superpowers-dsh` 的技能被改过名，升级包更新时会盖回去。
- 客户端脚本（`lib/client.js`）改动后要刷新页面；后端改动可以靠「刷新」重载。

## 命名规则

两位编号 + `-` + 词干，例如 `01-handoff`。改名时先剥掉原有数字前缀再重新编号；中途失败会回滚。
