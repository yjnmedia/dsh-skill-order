# dsh-skill-order

DSH 设置页里的「技能排序」。拖完点应用后，会同步改技能文件夹名和 `SKILL.md` 里的 `name`。斜杠菜单按 `name` 的码点排序，没有单独的排序配置。

## 会改哪里

- `C:\Users\Admin\.dsh\skills`（本地技能）
- `C:\Users\Admin\.dsh\profiles\desktop\node_modules\superpowers-dsh\skills`（升级包技能，升级会被盖回去）
- 不改软件 asar 里自带的 8 个技能

命名规则：`01-词干`。已有的 `1-` / `2-` 前缀会先剥掉再重新编号。失败会尽量改回去。

## 安装

```
E:\DeepSeek\resources\runtime\cli\bin\dsh.cmd plugin --profile desktop add E:\000Dev\dsh-skill-order
```

装完后重启 DSH。打开设置 → 技能排序。
