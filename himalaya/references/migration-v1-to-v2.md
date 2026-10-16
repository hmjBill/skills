# Himalaya v1 → v2 迁移参考

v2 是破坏性重写，命令树、配置格式与 v1 不兼容。`himalaya --version` 显示 1.x 时，主文档不适用——按下表迁移命令与配置，或直接升级到 v2。

## 版本时间线

| 版本 | 日期 | 备注 |
| ---- | ---- | ---- |
| v1.2.0 | 2026-02-19 | v1 末期版本 |
| v2.0.0 | 2026-07-26 | 破坏性重写发布 |
| v2.1.0 | — | — |
| v2.2.1 | 2026-10-02 | 本技能参考版本 |

上游仓库已从 soywod/himalaya 迁移到 [pimalaya/himalaya](https://github.com/pimalaya/himalaya)；许可证 MIT OR Apache-2.0；构建需 Rust 1.89+。

## 命令与概念映射

| v1 | v2 | 说明 |
| ---- | ---- | ---- |
| folder（概念） | mailbox | 全线更名 |
| `-f/--folder <名称>` | `-m/--mailbox <名称>` | 信箱参数换名 |
| `message write` | `message compose` | 别名 `write` / `new` 保留在 compose 上 |
| `message save` | `message add` | 存信命令更名 |
| `--output plain\|json` | `--json` | 只要 JSON 一种开关 |
| template 命令组 | 移除 | 模板渲染改用 pimalaya/mml |
| `watch` | 移除 | 常驻通知能力移交 Mirador；持续同步用 pimalaya/neverest |
| `account configure` / `account doctor` / `account edit` | 删除 | v2 另有顶层 `configure` 交互向导；配置直接编辑文件 |
| sendmail 后端 | 移除 | — |
| notmuch 后端 | 移除 | — |
| PGP 支持 | 移除 | — |
| keyring 集成 | 移除 | 改用 pass、secret-tool 等 CLI 经 `.command` 接入 |
| envelope search 的 `before` 字段 | 移除 | 用 `date` / `after` 表达 |

## 配置映射

| v1 | v2 |
| ---- | ---- |
| `[folder.alias]` | `[mailbox.alias]`（挂在账户块下） |
| `backend.type = "imap"` 及整块后端配置 | 扁平化的 `[imap]` / `[smtp]` 等键，直接写在账户块层级 |

## 全局选项变化

v2 移除：`--debug`、`--trace`（改用 `--log-level`）、`-f/--folder`（改 `-m/--mailbox`）、`-o/--output`（改 `--json`）。

碰到「未知选项」报错时优先怀疑本表；完整选项见 `himalaya --help`。
