# Obsidian Canvas 布局算法

思维导图（MindMap）和自由布局（Freeform）中节点定位的详细算法。

## 布局原则

### 通用间距常量

```
HORIZONTAL_SPACING = 320  // 节点中心之间的最小水平间距
VERTICAL_SPACING = 200    // 节点中心之间的最小垂直间距
NODE_PADDING = 20         // 节点内部留白
```

### 碰撞检测

在最终确定任何节点位置之前，验证：

```python
def check_collision(node1, node2):
    """若节点重叠或距离过近则返回 True"""
    center1_x = node1.x + node1.width / 2
    center1_y = node1.y + node1.height / 2
    center2_x = node2.x + node2.width / 2
    center2_y = node2.y + node2.height / 2
    
    dx = abs(center1_x - center2_x)
    dy = abs(center1_y - center2_y)
    
    min_dx = (node1.width + node2.width) / 2 + HORIZONTAL_SPACING
    min_dy = (node1.height + node2.height) / 2 + VERTICAL_SPACING
    
    return dx < min_dx or dy < min_dy
```

## 思维导图布局算法

### 1. 径向树布局

将根节点放在中心，径向排列子节点。

#### 第 1 步：定位根节点

```python
root = {
    "x": 0 - (root_width / 2),  # 水平居中
    "y": 0 - (root_height / 2), # 垂直居中
    "width": root_width,
    "height": root_height
}
```

#### 第 2 步：计算一级分支位置

将第一层子节点分布在根节点周围：

```python
def position_primary_branches(root, children, radius=400):
    """将第一层子节点排布在根节点周围的圆周上"""
    n = len(children)
    angle_step = 2 * pi / n
    
    positions = []
    for i, child in enumerate(children):
        angle = i * angle_step
        
        # 计算圆周上的位置
        x = root.center_x + radius * cos(angle) - child.width / 2
        y = root.center_y + radius * sin(angle) - child.height / 2
        
        positions.append({"x": x, "y": y})
    
    return positions
```

**半径选择：**
- 小型画布（≤10 个子节点）：400px
- 中型画布（11-20 个子节点）：500px
- 大型画布（>20 个子节点）：600px

#### 第 3 步：定位二级分支

对每个一级分支，排列其子节点：

**水平布局**（大多数情况下首选）：

```python
def position_secondary_horizontal(parent, children, distance=350):
    """在父节点右侧水平排列子节点"""
    n = len(children)
    total_height = sum(child.height for child in children)
    total_spacing = (n - 1) * VERTICAL_SPACING
    
    # 起始位置（垂直排列的顶部）
    start_y = parent.center_y - (total_height + total_spacing) / 2
    
    positions = []
    current_y = start_y
    
    for child in children:
        x = parent.x + parent.width + distance
        y = current_y
        
        positions.append({"x": x, "y": y})
        current_y += child.height + VERTICAL_SPACING
    
    return positions
```

**垂直布局**（用于左/右的一级分支）：

```python
def position_secondary_vertical(parent, children, distance=250):
    """在父节点下方垂直排列子节点"""
    n = len(children)
    total_width = sum(child.width for child in children)
    total_spacing = (n - 1) * HORIZONTAL_SPACING
    
    # 起始位置（水平排列的左侧）
    start_x = parent.center_x - (total_width + total_spacing) / 2
    
    positions = []
    current_x = start_x
    
    for child in children:
        x = current_x
        y = parent.y + parent.height + distance
        
        positions.append({"x": x, "y": y})
        current_x += child.width + HORIZONTAL_SPACING
    
    return positions
```

#### 第 4 步：平衡与调整

初始放置后，检查碰撞并调整：

```python
def balance_layout(nodes):
    """调整节点以避免重叠"""
    max_iterations = 10
    
    for iteration in range(max_iterations):
        collisions = find_all_collisions(nodes)
        if not collisions:
            break
        
        for node1, node2 in collisions:
            # 将 node2 移离 node1
            dx = node2.center_x - node1.center_x
            dy = node2.center_y - node1.center_y
            distance = sqrt(dx*dx + dy*dy)
            
            # 计算所需距离
            min_dist = calculate_min_distance(node1, node2)
            
            if distance > 0:
                # 按比例移动
                move_x = (dx / distance) * (min_dist - distance) / 2
                move_y = (dy / distance) * (min_dist - distance) / 2
                
                node2.x += move_x
                node2.y += move_y
```

### 2. 树布局（自顶向下层级式）

深层层级结构的替代方案。

#### 定位公式

```python
def position_tree_layout(root, tree):
    """自顶向下的树布局"""
    # 第 0 层（根节点）
    root.x = 0 - root.width / 2
    root.y = 0 - root.height / 2
    
    # 逐层处理
    for level in range(1, max_depth):
        nodes_at_level = get_nodes_at_level(tree, level)
        
        # 计算水平间距
        total_width = sum(node.width for node in nodes_at_level)
        total_spacing = (len(nodes_at_level) - 1) * HORIZONTAL_SPACING
        
        start_x = -(total_width + total_spacing) / 2
        y = level * (150 + VERTICAL_SPACING)  # 层级高度 150px
        
        current_x = start_x
        for node in nodes_at_level:
            node.x = current_x
            node.y = y
            current_x += node.width + HORIZONTAL_SPACING
```

## 自由布局算法

### 1. 基于内容的分组

首先，识别内容中的自然分组：

```python
def identify_groups(nodes, content_structure):
    """按语义关系对节点分组"""
    groups = []
    
    # 分析内容结构
    for section in content_structure:
        group_nodes = [node for node in nodes if node.section == section]
        
        if len(group_nodes) > 1:
            groups.append({
                "label": section.title,
                "nodes": group_nodes
            })
    
    return groups
```

### 2. 基于网格的区域布局

将画布划分为不同分组使用的区域：

```python
def layout_zones(groups, canvas_width=2000, canvas_height=1500):
    """在网格区域中排列分组"""
    n_groups = len(groups)
    
    # 计算网格尺寸
    cols = ceil(sqrt(n_groups))
    rows = ceil(n_groups / cols)
    
    zone_width = canvas_width / cols
    zone_height = canvas_height / rows
    
    # 分配区域
    zones = []
    for i, group in enumerate(groups):
        col = i % cols
        row = i // cols
        
        zone = {
            "x": col * zone_width - canvas_width / 2,
            "y": row * zone_height - canvas_height / 2,
            "width": zone_width * 0.9,  # 保留 10% 边距
            "height": zone_height * 0.9,
            "group": group
        }
        zones.append(zone)
    
    return zones
```

### 3. 区域内的节点定位

在每个区域内定位节点：

**方案 A：有机流动**

```python
def position_organic(zone, nodes):
    """区域内有机、流动的排列"""
    positions = []
    
    # 从区域左上角开始，留出边距
    current_x = zone.x + 50
    current_y = zone.y + 50
    row_height = 0
    
    for node in nodes:
        # 检查节点能否放入当前行
        if current_x + node.width > zone.x + zone.width - 50:
            # 移到下一行
            current_x = zone.x + 50
            current_y += row_height + VERTICAL_SPACING
            row_height = 0
        
        positions.append({
            "x": current_x,
            "y": current_y
        })
        
        current_x += node.width + HORIZONTAL_SPACING
        row_height = max(row_height, node.height)
    
    return positions
```

**方案 B：结构化网格**

```python
def position_grid(zone, nodes):
    """区域内的网格排列"""
    n = len(nodes)
    cols = ceil(sqrt(n))
    rows = ceil(n / cols)
    
    cell_width = (zone.width - 100) / cols  # 两侧各留 50px 边距
    cell_height = (zone.height - 100) / rows
    
    positions = []
    for i, node in enumerate(nodes):
        col = i % cols
        row = i // cols
        
        # 将节点居中于单元格
        x = zone.x + 50 + col * cell_width + (cell_width - node.width) / 2
        y = zone.y + 50 + row * cell_height + (cell_height - node.height) / 2
        
        positions.append({"x": x, "y": y})
    
    return positions
```

### 4. 跨区域连接

计算区域之间的最优边路径：

```python
def calculate_edge_path(from_node, to_node):
    """确定边的连接点"""
    # 计算中心
    from_center = (from_node.x + from_node.width/2, 
                   from_node.y + from_node.height/2)
    to_center = (to_node.x + to_node.width/2,
                 to_node.y + to_node.height/2)
    
    # 确定最佳的连接边侧
    dx = to_center[0] - from_center[0]
    dy = to_center[1] - from_center[1]
    
    # 根据方向选择边侧
    if abs(dx) > abs(dy):
        # 水平连接
        from_side = "right" if dx > 0 else "left"
        to_side = "left" if dx > 0 else "right"
    else:
        # 垂直连接
        from_side = "bottom" if dy > 0 else "top"
        to_side = "top" if dy > 0 else "bottom"
    
    return {
        "fromSide": from_side,
        "toSide": to_side
    }
```

## 高级技术

### 力导向布局

适用于存在大量交叉连接的复杂网络：

```python
def force_directed_layout(nodes, edges, iterations=100):
    """基于弹簧的布局算法"""
    # 常量
    SPRING_LENGTH = 200
    SPRING_CONSTANT = 0.1
    REPULSION_CONSTANT = 5000
    
    for iteration in range(iterations):
        # 计算斥力（所有节点对）
        for node1 in nodes:
            force_x, force_y = 0, 0
            
            for node2 in nodes:
                if node1 == node2:
                    continue
                
                dx = node1.x - node2.x
                dy = node1.y - node2.y
                distance = sqrt(dx*dx + dy*dy)
                
                if distance > 0:
                    # 斥力
                    force = REPULSION_CONSTANT / (distance * distance)
                    force_x += (dx / distance) * force
                    force_y += (dy / distance) * force
            
            node1.force_x = force_x
            node1.force_y = force_y
        
        # 计算引力（相连节点）
        for edge in edges:
            node1 = get_node(edge.fromNode)
            node2 = get_node(edge.toNode)
            
            dx = node2.x - node1.x
            dy = node2.y - node1.y
            distance = sqrt(dx*dx + dy*dy)
            
            # 弹簧力
            force = SPRING_CONSTANT * (distance - SPRING_LENGTH)
            
            node1.force_x += (dx / distance) * force
            node1.force_y += (dy / distance) * force
            node2.force_x -= (dx / distance) * force
            node2.force_y -= (dy / distance) * force
        
        # 应用力
        for node in nodes:
            node.x += node.force_x
            node.y += node.force_y
```

### 层次聚类

自动分组相关节点：

```python
def hierarchical_cluster(nodes, similarity_threshold=0.7):
    """按内容相似度对节点聚类"""
    clusters = []
    
    # 计算相似度矩阵
    similarity = calculate_similarity_matrix(nodes)
    
    # 凝聚聚类
    current_clusters = [[node] for node in nodes]
    
    while len(current_clusters) > 1:
        # 找到最相似的簇
        max_sim = 0
        merge_i, merge_j = 0, 1
        
        for i in range(len(current_clusters)):
            for j in range(i + 1, len(current_clusters)):
                sim = cluster_similarity(current_clusters[i], 
                                       current_clusters[j], 
                                       similarity)
                if sim > max_sim:
                    max_sim = sim
                    merge_i, merge_j = i, j
        
        if max_sim < similarity_threshold:
            break
        
        # 合并簇
        current_clusters[merge_i].extend(current_clusters[merge_j])
        current_clusters.pop(merge_j)
    
    return current_clusters
```

## 布局优化

### 最小化边交叉

```python
def minimize_crossings(nodes, edges):
    """通过重新定位节点减少边交叉"""
    crossings = count_crossings(edges)
    
    # 尝试交换相邻节点
    improved = True
    while improved:
        improved = False
        
        for i in range(len(nodes) - 1):
            # 交换节点 i 和 i+1
            swap_positions(nodes[i], nodes[i+1])
            new_crossings = count_crossings(edges)
            
            if new_crossings < crossings:
                crossings = new_crossings
                improved = True
            else:
                # 换回来
                swap_positions(nodes[i], nodes[i+1])
```

### 视觉平衡

```python
def calculate_visual_weight(canvas):
    """计算质心以实现视觉平衡"""
    total_weight = 0
    weighted_x = 0
    weighted_y = 0
    
    for node in canvas.nodes:
        # 权重与面积成正比
        weight = node.width * node.height
        total_weight += weight
        
        weighted_x += node.center_x * weight
        weighted_y += node.center_y * weight
    
    center_x = weighted_x / total_weight
    center_y = weighted_y / total_weight
    
    # 平移整个画布，使中心位于 (0, 0)
    offset_x = -center_x
    offset_y = -center_y
    
    for node in canvas.nodes:
        node.x += offset_x
        node.y += offset_y
```

## 性能优化

### 空间索引

对于大型画布，使用空间索引加速碰撞检测：

```python
class SpatialGrid:
    """用于快速碰撞检测的基于网格的空间索引"""
    
    def __init__(self, cell_size=500):
        self.cell_size = cell_size
        self.grid = {}
    
    def add_node(self, node):
        """将节点添加到网格"""
        cells = self.get_cells(node)
        for cell in cells:
            if cell not in self.grid:
                self.grid[cell] = []
            self.grid[cell].append(node)
    
    def get_cells(self, node):
        """获取节点占据的网格单元格"""
        min_x = int(node.x / self.cell_size)
        max_x = int((node.x + node.width) / self.cell_size)
        min_y = int(node.y / self.cell_size)
        max_y = int((node.y + node.height) / self.cell_size)
        
        cells = []
        for x in range(min_x, max_x + 1):
            for y in range(min_y, max_y + 1):
                cells.append((x, y))
        return cells
    
    def get_nearby_nodes(self, node):
        """获取附近单元格中的节点"""
        cells = self.get_cells(node)
        nearby = set()
        
        for cell in cells:
            if cell in self.grid:
                nearby.update(self.grid[cell])
        
        return nearby
```

## 常见布局模式

### 时间线布局

用于按时间顺序排列的内容：

```python
def layout_timeline(events, direction="horizontal"):
    """创建时间线布局"""
    if direction == "horizontal":
        for i, event in enumerate(events):
            event.x = i * (event.width + HORIZONTAL_SPACING)
            event.y = 0
    else:  # 垂直
        for i, event in enumerate(events):
            event.x = 0
            event.y = i * (event.height + VERTICAL_SPACING)
```

### 圆形布局

适用于循环过程：

```python
def layout_circular(nodes, radius=500):
    """将节点排成圆形"""
    n = len(nodes)
    angle_step = 2 * pi / n
    
    for i, node in enumerate(nodes):
        angle = i * angle_step
        node.x = radius * cos(angle) - node.width / 2
        node.y = radius * sin(angle) - node.height / 2
```

### 矩阵布局

用于比较多个维度：

```python
def layout_matrix(nodes, rows, cols):
    """将节点排成矩阵"""
    cell_width = 400
    cell_height = 250
    
    for i, node in enumerate(nodes):
        row = i // cols
        col = i % cols
        
        node.x = col * cell_width
        node.y = row * cell_height
```

## 质量检查

定稿布局之前，验证：

1. **无重叠**：所有节点都有最小间距
2. **平衡**：视觉中心接近 (0, 0)
3. **可达**：所有节点都能通过边到达
4. **可读**：文本大小适合缩放级别
5. **高效**：边路径尽可能直接

把这些算法作为基础，根据具体内容和用户偏好进行调整。
