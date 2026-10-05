# Mermaid 语法规则参考

本参考提供 Mermaid 图表的全面语法规则和错误预防策略。遇到语法错误或需要详细语法信息时加载本文件。

## 目录

1. [关键错误预防](#关键错误预防)
2. [节点语法](#节点语法)
3. [Subgraph 语法](#subgraph-语法)
4. [箭头与连接类型](#箭头与连接类型)
5. [样式与颜色](#样式与颜色)
6. [布局与方向](#布局与方向)
7. [高级模式](#高级模式)
8. [故障排除](#故障排除)

## 关键错误预防

### 列表语法冲突（最常见的错误）

**问题：** Mermaid 解析器会把 `number. space` 解释为 Markdown 有序列表语法。

**错误信息：** `Parse error: Unsupported markdown: list`

**解决方案：**

```mermaid
❌ [1. Perception]
❌ [2. Planning]
❌ [3. Reasoning]

✅ [1.Perception]           # 去掉空格
✅ [① Perception]           # 使用带圈数字
✅ [(1) Perception]         # 使用括号
✅ [Step 1: Perception]     # 使用前缀
✅ [Step 1 - Perception]    # 使用短横线
✅ [Perception]             # 去掉编号
```

**带圈数字参考：**
```
① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ ⑪ ⑫ ⑬ ⑭ ⑮ ⑯ ⑰ ⑱ ⑲ ⑳
```

### Subgraph 命名规则

**规则：** 名称含空格的 subgraph 必须使用 ID + 显示名的格式。

```mermaid
❌ subgraph Core Process
     A --> B
   end

✅ subgraph core["Core Process"]
     A --> B
   end

✅ subgraph core_process
     A --> B
   end
```

**引用 subgraph：**
```mermaid
❌ Title --> Core Process      # 不能引用显示名
✅ Title --> core              # 必须引用 ID
```

### 节点引用规则

**规则：** 始终按 ID 引用节点，绝不使用显示文本。

```mermaid
# 定义节点
A[Display Text A]
B["Display Text B"]

# 引用节点
A --> B                        ✅ 使用节点 ID
Display Text A --> Display Text B  ❌ 不能使用显示文本
```

## 节点语法

### 基本节点类型

```mermaid
# 矩形（默认）
A[Rectangle Text]

# 圆角矩形
B(Rounded Text)

# 体育场形
C([Stadium Text])

# 圆形
D((Circle<br/>Text))

# 非对称形状
E>Right Arrow]

# 菱形（判断）
F{Decision?}

# 六边形
G{{Hexagon}}

# 平行四边形
H[/Parallelogram/]

# 数据库
I[(Database)]

# 梯形
J[/Trapezoid\]
```

### 节点文本规则

**换行：**
- `<br/>` 仅在圆形节点中有效：`((Text<br/>Break))`
- 其他节点请使用单独的注释节点，或保持文本简洁

**特殊字符：**
- 空格：需要时使用引号：`["Text with spaces"]`
- 引号：替换为 『』 或避免使用
- 圆括号：替换为 「」 或避免使用
- 冒号：通常安全，但若引发问题则避免
- 连字符/短横线：可安全使用

**长度指引：**
- 节点文本保持在 50 个字符以内
- 更长内容使用多行（圆形节点）或单独的注释节点
- 文本过长时考虑拆分为多个节点

## Subgraph 语法

### 基本结构

```mermaid
flowchart TB
    # 正确格式：ID + 显示名
    subgraph id["Display Name"]
        direction TB
        A --> B
    end
    
    # 仅简单 ID（无空格）
    subgraph simple
        C --> D
    end
    
    # 可在 subgraph 内设置方向
    subgraph horiz["Horizontal"]
        direction LR
        E --> F
    end
```

### 嵌套 Subgraph

```mermaid
flowchart TB
    subgraph outer["Outer Group"]
        direction TB
        
        subgraph inner1["Inner 1"]
            A --> B
        end
        
        subgraph inner2["Inner 2"]
            C --> D
        end
        
        inner1 -.-> inner2
    end
```

**限制：** 为可读性，嵌套最多保持 2 层。

### 连接 Subgraph

```mermaid
flowchart TB
    subgraph g1["Group 1"]
        A[Node A]
    end
    
    subgraph g2["Group 2"]
        B[Node B]
    end
    
    # 连接单个节点（推荐）
    A --> B
    
    # 连接 subgraph（创建用于布局的隐形链接）
    g1 -.-> g2
```

## 箭头与连接类型

### 基本箭头

```mermaid
A --> B          # 实线箭头
A -.-> B         # 虚线箭头
A ==> B          # 粗箭头
A ~~~> B         # 隐形链接（仅用于布局，不渲染）
```

### 箭头标签

```mermaid
A -->|Label Text| B
A -.->|Optional| B
A ==>|Important| B
```

### 多目标连接

```mermaid
# 一对多
A --> B & C & D

# 多对一
A & B & C --> D

# 链式连接
A --> B --> C --> D
```

### 双向

```mermaid
A <--> B         # 双向实线
A <-.-> B        # 双向虚线
```

## 样式与颜色

### 内联样式

```mermaid
style NodeID fill:#color,stroke:#color,stroke-width:2px
```

### 颜色格式

- 十六进制颜色：`#ff0000` 或 `#f00`
- RGB：`rgb(255,0,0)`
- 颜色名：`red`、`blue` 等（支持有限）

### 常用样式模式

```mermaid
# 专业外观
style A fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px

# 强调
style B fill:#ffe3e3,stroke:#c92a2a,stroke-width:3px

# 柔和/次要
style C fill:#f8f9fa,stroke:#dee2e6,stroke-width:1px

# 标题/页眉
style D fill:#1971c2,stroke:#1971c2,stroke-width:3px,color:#ffffff
```

### 为多个节点设置样式

```mermaid
# 对多个节点应用相同样式
style A,B,C fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px
```

## 布局与方向

### 方向代码

```mermaid
flowchart TB    # 从上到下（垂直）
flowchart BT    # 从下到上
flowchart LR    # 从左到右（水平）
flowchart RL    # 从右到左
flowchart TD    # 自上而下（与 TB 相同）
```

### 布局控制技巧

1. **垂直布局（TB/BT）：** 最适合顺序流程、层级结构
2. **水平布局（LR/RL）：** 最适合时间线、宽幅显示
3. **混合方向：** 在不同 subgraph 中设置不同方向

```mermaid
flowchart TB
    subgraph vertical["Vertical Flow"]
        direction TB
        A --> B --> C
    end
    
    subgraph horizontal["Horizontal Flow"]
        direction LR
        D --> E --> F
    end
```

## 高级模式

### 反馈循环模式

```mermaid
flowchart TB
    A[Start] --> B[Process]
    B --> C[Output]
    C -.->|Feedback| A
    
    style A fill:#d3f9d8,stroke:#2f9e44,stroke-width:2px
    style B fill:#e5dbff,stroke:#5f3dc4,stroke-width:2px
    style C fill:#c5f6fa,stroke:#0c8599,stroke-width:2px
```

### 泳道模式

```mermaid
flowchart TB
    subgraph lane1["Lane 1"]
        A[Step 1] --> B[Step 2]
    end
    
    subgraph lane2["Lane 2"]
        C[Step 3] --> D[Step 4]
    end
    
    B --> C
```

### 中心辐射模式

```mermaid
flowchart TB
    Hub[Central Hub]
    
    A[Spoke 1] --> Hub
    B[Spoke 2] --> Hub
    C[Spoke 3] --> Hub
    Hub --> D[Output]
```

### 决策树

```mermaid
flowchart TB
    Start[Start] --> Decision{Decision Point?}
    Decision -->|Option A| PathA[Path A]
    Decision -->|Option B| PathB[Path B]
    Decision -->|Option C| PathC[Path C]
    
    PathA --> End[End]
    PathB --> End
    PathC --> End
```

### 对比布局

```mermaid
flowchart TB
    Title[Comparison]
    
    subgraph left["System A"]
        A1[Feature 1]
        A2[Feature 2]
        A3[Feature 3]
    end
    
    subgraph right["System B"]
        B1[Feature 1]
        B2[Feature 2]
        B3[Feature 3]
    end
    
    Title --> left
    Title --> right
    
    subgraph compare["Key Differences"]
        Diff[Difference Summary]
    end
    
    left --> compare
    right --> compare
```

## 故障排除

### 常见错误与解决方案

#### 错误："Parse error on line X: Expecting 'SEMI', 'NEWLINE', 'EOF'"

**原因：**
1. 含空格的 subgraph 名称未使用 ID 格式
2. 节点引用使用显示文本而非 ID
3. 节点文本中包含无效特殊字符

**解决方案：**
- 使用 `subgraph id["Display Name"]` 格式
- 仅按 ID 引用节点
- 对含特殊字符的节点文本加引号

#### 错误："Unsupported markdown: list"

**原因：** 在节点文本中使用 `number. space` 模式

**解决方案：** 去掉空格或使用替代写法（①、(1)、Step 1:）

#### 错误："Parse error: unexpected character"

**原因：**
1. 未转义的特殊字符
2. 引号使用不当
3. 无效的 Mermaid 语法

**解决方案：**
- 替换有问题的字符（引号 → 『』，圆括号 → 「」）
- 使用正确的节点定义语法
- 检查箭头语法

#### 图表渲染不正确

**原因：**
1. 缺少样式声明
2. 方向指定错误
3. 无效连接

**解决方案：**
- 确认所有样式声明使用有效语法
- 检查方向是否在 flowchart 声明或 subgraph 中设置
- 确保引用前所有节点 ID 已定义

### 验证清单

定稿任何图表之前：

- [ ] 节点文本中无 `number. space` 模式
- [ ] 含空格的 subgraph 均使用正确的 ID 语法
- [ ] 所有节点引用使用 ID 而非显示文本
- [ ] 所有箭头使用有效语法（-->、-.->）
- [ ] 所有样式声明语法正确
- [ ] 显式设置了方向
- [ ] 节点文本中无未转义的特殊字符
- [ ] 所有连接引用的节点均已定义

### 平台特定说明

**Obsidian：**
- Mermaid 版本较旧，解析更严格
- 对 `<br/>` 支持有限（仅圆形节点）
- 定稿前先测试图表

**GitHub：**
- Mermaid 支持良好
- 可渲染大多数现代语法
- 渲染结果可能与 Obsidian 略有不同

**Mermaid Live Editor：**
- 最新的解析器
- 最适合测试新语法
- 可能支持 Obsidian/GitHub 尚不可用的特性

## 快速参考

### 安全的编号方式
✅ `1.Text` `①Text` `(1)Text` `Step 1:Text`
❌ `1. Text`

### 安全的 Subgraph 语法
✅ `subgraph id["Name"]` `subgraph simple_name`
❌ `subgraph Name With Spaces`

### 安全的节点引用
✅ `NodeID --> AnotherID`
❌ `"Display Text" --> "Other Text"`

### 安全的特殊字符
✅ 引号用 `『』`，圆括号用 `「」`
❌ 未转义的 `"`、问题上下文中的 `()`
