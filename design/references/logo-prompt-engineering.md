# Logo AI 提示词工程

## 核心提示词结构

```
Professional logo design for [brand/industry]:
[Visual description]
Style: [style keywords]
Colors: [color palette]
Requirements: [technical specs]
```

## 按风格分类的有效关键词

### 极简
```
minimalist, clean lines, simple geometric shapes, essential elements only,
high white space, flat design, single color, modern, uncluttered,
negative space, subtle, refined
```

### 复古/怀旧
```
vintage, retro, heritage, established, classic, nostalgic, weathered,
distressed texture, badge style, hand-lettered, craft, artisan,
sepia tones, muted colors, aged paper effect
```

### 奢华/高端
```
luxury, elegant, sophisticated, premium, refined, exclusive, high-end,
gold accents, metallic, minimal, tasteful, upscale, prestige,
thin lines, serif typography, foil effect
```

### 现代/科技
```
modern, innovative, digital, tech-forward, sleek, futuristic,
gradient colors, geometric, abstract, dynamic, cutting-edge,
clean sans-serif, circuit-like, data visualization
```

### 俏皮/有趣
```
playful, fun, colorful, friendly, approachable, cheerful, whimsical,
bouncy, rounded shapes, bright colors, cartoon-like, energetic,
bubbly, hand-drawn elements
```

### 有机/自然
```
organic, natural, flowing, botanical, eco-friendly, sustainable,
earth tones, leaf elements, hand-drawn, imperfect lines, growth,
green, nature-inspired, biophilic
```

## 负向提示词（应避免的内容）

始终包含以防止不想要的结果：
```
NOT: photorealistic, 3D render with realistic textures, photograph,
stock image, clip art, multiple logos, busy background, text watermarks,
low quality, blurry, distorted, complex detailed patterns
```

## 行业专属提示词

### 科技初创
```
Modern tech company logo, abstract geometric mark, gradient blue to purple,
clean minimal design, innovative feel, scalable vector style,
professional quality, silicon valley aesthetic
```

### 医疗
```
Healthcare medical logo, clean professional design, cross or heart symbol,
calming blue and teal colors, trustworthy appearance, caring feel,
simple scalable mark, HIPAA-appropriate conservative style
```

### 餐厅/食品
```
Restaurant logo, warm inviting colors, appetizing feel, vintage badge style,
chef or utensil iconography, friendly welcoming design, rustic charm,
established look, readable at small sizes
```

### 时尚品牌
```
Fashion brand logo, elegant sophisticated wordmark, luxury aesthetic,
black and gold color scheme, thin refined typography, haute couture feel,
minimal exclusive design, high-end positioning
```

### 环保/可持续
```
Eco-friendly sustainable brand logo, organic natural elements, leaf motif,
earth green and brown colors, growth symbolism, environmental awareness,
clean modern yet natural feel, recyclable-look design
```

## 应包含的技术要求

### 可缩放性
```
vector-style, scalable at any size, clear silhouette,
works as favicon, recognizable small scale, simple shapes
```

### 多场景适用
```
works on light and dark backgrounds, single color version possible,
horizontal and stacked layouts, brand mark can stand alone
```

### 质量
```
professional quality, print-ready, high resolution,
crisp edges, balanced composition, centered design
```

## 提示词模板

### 快速生成
```
Professional [industry] logo, [style] design, [color] colors,
clean modern aesthetic, scalable vector style
```

### 详细简报
```
Professional logo design for [brand name], a [industry] company.

Visual style: [style keywords]
Primary colors: [hex codes]
Mood: [emotional keywords]
Symbols: [iconography hints]

Technical: Vector-style illustration, scalable, works in single color,
centered on plain background, no text unless specified.
```

### 变体请求
```
Alternative version of [brand] logo:
Keep: [elements to preserve]
Change: [elements to modify]
Style direction: [new style keywords]
```

## 常见陷阱

1. **过于复杂** - AI 会生成复杂细节；要求 "simple"（简单）
2. **背景不明确** - 明确指定 "plain white background"（纯白背景）
3. **文字问题** - AI 处理文字较困难；将标志单独生成
4. **比例错误** - 指定 "1:1 square"（方形）或 "horizontal"（横向）
5. **写实风格** - 添加 "illustration, vector-style, not photorealistic"
