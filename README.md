<h1 align="center">dsh-skill-order</h1>

<p align="center">
  <b>DSH 的技能管家：排序、改名、自动规范，改完立刻生效。</b>
</p>

<p align="center">
  <a href="https://github.com/yjnmedia/dsh-skill-order/releases"><img alt="version" src="https://img.shields.io/github/package-json/v/yjnmedia/dsh-skill-order?label=version&color=4D6BFE"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-2EA44F"></a>
  <img alt="dsh" src="https://img.shields.io/badge/DSH-%E2%89%A5%200.2.2--rc.1-6E6E6E">
  <img alt="skills" src="https://img.shields.io/badge/skills-%E4%BB%85%E6%9C%AC%E6%9C%BA-8A8A8A">
</p>

<p align="center">
  <a href="#装">装</a> ·
  <a href="#为什么需要它">为什么需要它</a> ·
  <a href="#能做什么">能做什么</a> ·
  <a href="docs/DEVELOPMENT.md">开发</a>
</p>

## 装

**一、从市场装。** 在 DSH 的插件市场里添加索引：

```
https://raw.githubusercontent.com/yjnmedia/dsh-skill-order/main/market-index.json
```

**二、一条命令装。** 把 `<profile>` 换成你实际在用的配置名（桌面版是 `desktop`，网页版是 `web`）：

```sh
dsh plugin --profile <profile> add github:yjnmedia/dsh-skill-order
```

装完打开 **设置 → 技能排序**。没有这一项，说明插件没加载，见 [排障](docs/DEVELOPMENT.md#插件没加载)。

## 为什么需要它

DSH 的斜杠菜单只按技能名的字符编码排，没有排序配置项；也没有界面能改名、看简介长短、发现库里悄悄多出来的技能。

技能一多就乱：名字不规范，`/` 里调不出；简介太长，菜单里被截断；顺序不对，常用的压在最后。改一处，只能手工翻文件夹、再重启。

## 能做什么

**排** 拖动调整顺序，行末 ↑ 一键置顶。点「应用」才落盘，目录名和 `SKILL.md` 一起改，失败回滚。

**改** 行内铅笔只换词干，编号按位置自动重排；简介超过 20 个汉字标黄，应用前提醒一次。

**收** 后台每 2 秒看一次技能目录：新技能自动补编号、洗净名字、把过长简介调模型改到 20 字内，顶到最前并提示，直到你点「应用」。

**通** 改完通知宿主清技能缓存并广播，`/` 菜单当场变；别的工具改的也跟得上；插件自己更新了，点「刷新」就装上。

**不做什么** 只管排序、改名、规范。启用、删除、创建、导入都不归它。

## 要求

- DSH `>= 0.2.2-rc.1`，桌面版或 `dsh web` 都可以。
- 简介自动改写要调模型：宿主挂了 `llm` 服务才生效，没挂就跳过，原文保留。
- 全部在本地跑。除了装插件本身，不对外发任何请求。

## 会动哪些文件

- `~/.dsh/skills`（你自己的技能）
- `<profile>/node_modules/superpowers-dsh/skills`（升级包带的技能，插件升级会被盖回去）
- `~/.dsh/dsh-skill-order.json`（两个开关与已见技能快照）

asar 内置的 8 个技能不碰，磁盘上没有它们独立的 `SKILL.md`。

## 许可

MIT。开发和排障细节见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。
