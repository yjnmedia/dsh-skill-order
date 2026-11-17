<h1 align="center">dsh-skill-order</h1>

<p align="center">Also called "Skill Keeper" — one plugin, two names.</p>

<p align="center"><a href="README.md">中文</a></p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#why">Why</a> ·
  <a href="#what-it-does">What it does</a> ·
  <a href="docs/DEVELOPMENT.md">Development</a>
</p>

<p align="center">
  <b>The skill keeper for DSH: order, rename, tidy up — applied instantly.</b>
</p>


<p align="center">
  <a href="https://github.com/yjnmedia/dsh-skill-order/releases"><img alt="version" src="https://img.shields.io/github/package-json/v/yjnmedia/dsh-skill-order?label=version&color=4D6BFE"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-2EA44F"></a>
  <img alt="dsh" src="https://img.shields.io/badge/DSH-%E2%89%A5%200.2.2--rc.1-6E6E6E">
</p>

## Install

**1. From the marketplace.** Add this index URL in the DSH plugin market:

```
https://raw.githubusercontent.com/yjnmedia/dsh-skill-order/main/market-index.json
```

**2. One command.** Replace `<profile>` with your profile name (`desktop` for the desktop app, `web` for `dsh web`):

```sh
dsh plugin --profile <profile> add github:yjnmedia/dsh-skill-order
```

Then open **Settings → Skill order**. If the entry is missing, the plugin did not load — see [development notes](docs/DEVELOPMENT.md#插件没加载).

## Why

DSH orders the slash menu by raw skill-name encoding. There is no order setting, no way to rename, no way to see how long descriptions are, and no warning when skills quietly appear in the folder.

With many skills this falls apart: names that do not follow the convention never show up in `/`; long descriptions get truncated; frequently used skills sink to the bottom. Fixing one thing used to mean digging through folders and restarting.

## What it does

**Order** — drag to reorder, the arrow button sends an item to the top. Nothing is written until you click Apply; folder names and `SKILL.md` change together and roll back on failure.

**Rename** — the pencil changes only the stem; numeric prefixes are renumbered by position. Descriptions over 20 characters are highlighted, with one reminder before applying.

**Collect** — every 2 seconds the plugin looks at the skills folder: new skills get numbered, cleaned up, over-long descriptions shortened by the model, pinned to the top with a banner, until you click Apply.

**Sync** — after applying, the host is told to drop the skill cache and broadcast; the `/` menu updates immediately, including changes made by other tools. When the plugin itself updates, one Refresh installs it.

**Not in scope** — enable, delete or create. Ordering, renaming, tidying and importing only.

## Requirements

- DSH `>= 0.2.2-rc.1`, desktop or `dsh web`.
- Automatic description rewriting needs the host's `llm` service; without it the step is skipped and text is preserved.
- Everything runs locally. Apart from installing the plugin, no outbound requests.

## Which files it touches

- `~/.dsh/skills` (your own skills)
- `<profile>/node_modules/superpowers-dsh/skills` (bundled skills; plugin upgrades overwrite them)
- `~/.dsh/dsh-skill-order.json` (the two switches and the seen-skills snapshot)

The 8 built-in asar skills are never touched — they have no standalone `SKILL.md` on disk.

## Language

The panel follows your system language and can be switched with the `EN / 中文` button in the panel header; the choice is remembered in `localStorage`. Only the interface is translated — skill names and descriptions stay exactly as they are on disk.

## License

MIT. Development details: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
