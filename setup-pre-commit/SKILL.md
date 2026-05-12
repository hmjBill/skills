---
name: setup-pre-commit
description: Set up Husky pre-commit hooks with lint-staged (Prettier), type checking, and tests in the current repo. Use when user wants to add pre-commit hooks, set up Husky, configure lint-staged, or add commit-time formatting/typechecking/testing.
---

# 设置 Pre-Commit Hooks

## 此设置包含的内容

- **Husky** pre-commit hook
- **lint-staged** 在所有暂存文件上运行 Prettier
- **Prettier** 配置（如果缺失）
- pre-commit hook 中的 **typecheck** 和 **test** 脚本

## 步骤

### 1. 检测包管理器

检查 `package-lock.json`（npm）、`pnpm-lock.yaml`（pnpm）、`yarn.lock`（yarn）、`bun.lockb`（bun）。使用存在的任何一个。如果不确定，默认使用 npm。

### 2. 安装依赖

作为 devDependencies 安装：

```
husky lint-staged prettier
```

### 3. 初始化 Husky

```bash
npx husky init
```

这会创建 `.husky/` 目录并添加 `prepare: "husky"` 到 package.json。

### 4. 创建 `.husky/pre-commit`

写入此文件（Husky v9+ 不需要 shebang）：

```
npx lint-staged
npm run typecheck
npm run test
```

**适配**：将 `npm` 替换为检测到的包管理器。如果仓库在 package.json 中没有 `typecheck` 或 `test` 脚本，省略这些行并告知用户。

### 5. 创建 `.lintstagedrc`

```json
{
  "*": "prettier --ignore-unknown --write"
}
```

### 6. 创建 `.prettierrc`（如果缺失）

仅在没有 Prettier 配置时创建。使用以下默认值：

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "printWidth": 80,
  "singleQuote": false,
  "trailingComma": "es5",
  "semi": true,
  "arrowParens": "always"
}
```

### 7. 验证

- [ ] `.husky/pre-commit` 存在且可执行
- [ ] `.lintstagedrc` 存在
- [ ] package.json 中的 `prepare` 脚本是 `"husky"`
- [ ] Prettier 配置存在
- [ ] 运行 `npx lint-staged` 验证其工作

### 8. 提交

暂存所有已更改/创建的文件并使用消息提交：`Add pre-commit hooks (husky + lint-staged + prettier)`

这将通过新的 pre-commit hooks 运行 — 这是验证一切正常的好方法。

## 注意事项

- Husky v9+ 不需要在 hook 文件中使用 shebang
- `prettier --ignore-unknown` 跳过 Prettier 无法解析的文件（图片等）
- pre-commit 先运行 lint-staged（快速，仅暂存文件），然后是完整的 typecheck 和 tests
