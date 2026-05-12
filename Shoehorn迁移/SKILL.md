---
name: migrate-to-shoehorn
description: Migrate test files from `as` type assertions to @total-typescript/shoehorn. Use when user mentions shoehorn, wants to replace `as` in tests, or needs partial test data.
---

# 迁移到 Shoehorn

## 为什么用 shoehorn？

`shoehorn` 让您可以在测试中传递部分数据同时保持 TypeScript 满意。它用类型安全的替代方案替换 `as` 断言。

**仅用于测试代码。** 永远不要在生产代码中使用 shoehorn。

`as` 在测试中的问题：

- 训练有素不使用它
- 必须手动指定目标类型
- 双 as（`as unknown as Type`）用于故意错误的数据

## 安装

```bash
npm i @total-typescript/shoehorn
```

## 迁移模式

### 大对象只有少数需要的属性

之前：

```ts
type Request = {
  body: { id: string };
  headers: Record<string, string>;
  cookies: Record<string, string>;
  // ...20 more properties
};

it("gets user by id", () => {
  // Only care about body.id but must fake entire Request
  getUser({
    body: { id: "123" },
    headers: {},
    cookies: {},
    // ...fake all 20 properties
  });
});
```

之后：

```ts
import { fromPartial } from "@total-typescript/shoehorn";

it("gets user by id", () => {
  getUser(
    fromPartial({
      body: { id: "123" },
    }),
  );
});
```

### `as Type` → `fromPartial()`

之前：

```ts
getUser({ body: { id: "123" } } as Request);
```

之后：

```ts
import { fromPartial } from "@total-typescript/shoehorn";

getUser(fromPartial({ body: { id: "123" } }));
```

### `as unknown as Type` → `fromAny()`

之前：

```ts
getUser({ body: { id: 123 } } as unknown as Request); // wrong type on purpose
```

之后：

```ts
import { fromAny } from "@total-typescript/shoehorn";

getUser(fromAny({ body: { id: 123 } }));
```

## 何时使用哪个

| 函数            | 用例                                           |
| --------------- | ---------------------------------------------- |
| `fromPartial()` | 传递仍然类型检查的部分数据           |
| `fromAny()`     | 传递故意错误的数据（保持自动补全） |
| `fromExact()`   | 强制完整对象（稍后与 fromPartial 交换）    |

## 工作流程

1. **收集需求** - 问用户：
   - 哪些测试文件有造成问题的 `as` 断言？
   - 他们处理的是只有某些属性重要的大对象吗？
   - 他们需要传递故意错误的数据来进行错误测试吗？

2. **安装并迁移**：
   - [ ] 安装：`npm i @total-typescript/shoehorn`
   - [ ] 找到有 `as` 断言的测试文件：`grep -r " as [A-Z]" --include="*.test.ts" --include="*.spec.ts"`
   - [ ] 将 `as Type` 替换为 `fromPartial()`
   - [ ] 将 `as unknown as Type` 替换为 `fromAny()`
   - [ ] 从 `@total-typescript/shoehorn` 添加导入
   - [ ] 运行类型检查以验证
