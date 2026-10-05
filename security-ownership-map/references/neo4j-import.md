# Neo4j 导入说明

将所有权图持久化到 Neo4j 时使用以下步骤。

## 快速导入（LOAD CSV）

1. 将 `people.csv`、`files.csv` 和 `edges.csv` 复制到 Neo4j 的 import 目录。
2. 从 Neo4j Browser 或 `cypher-shell` 运行以下 Cypher：

```cypher
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT file_id IF NOT EXISTS FOR (f:File) REQUIRE f.id IS UNIQUE;

LOAD CSV WITH HEADERS FROM 'file:///people.csv' AS row
MERGE (p:Person {id: row.person_id})
SET p.name = row.name,
    p.email = row.email,
    p.first_seen = row.first_seen,
    p.last_seen = row.last_seen,
    p.commit_count = toInteger(row.commit_count),
    p.touches = toInteger(row.touches),
    p.sensitive_touches = toFloat(row.sensitive_touches),
    p.primary_tz_offset = CASE row.primary_tz_offset WHEN '' THEN null ELSE row.primary_tz_offset END,
    p.primary_tz_minutes = CASE row.primary_tz_minutes WHEN '' THEN null ELSE toInteger(row.primary_tz_minutes) END,
    p.timezone_offsets = CASE row.timezone_offsets WHEN '' THEN null ELSE row.timezone_offsets END;

LOAD CSV WITH HEADERS FROM 'file:///files.csv' AS row
MERGE (f:File {id: row.file_id})
SET f.path = row.path,
    f.first_seen = row.first_seen,
    f.last_seen = row.last_seen,
    f.commit_count = toInteger(row.commit_count),
    f.touches = toInteger(row.touches),
    f.bus_factor = toInteger(row.bus_factor),
    f.sensitivity_score = toFloat(row.sensitivity_score),
    f.sensitivity_tags = row.sensitivity_tags;

LOAD CSV WITH HEADERS FROM 'file:///edges.csv' AS row
MATCH (p:Person {id: row.person_id})
MATCH (f:File {id: row.file_id})
MERGE (p)-[r:TOUCHES]->(f)
SET r.touches = toInteger(row.touches),
    r.recency_weight = toFloat(row.recency_weight),
    r.first_seen = row.first_seen,
    r.last_seen = row.last_seen,
    r.sensitive_weight = toFloat(row.sensitive_weight);

LOAD CSV WITH HEADERS FROM 'file:///cochange_edges.csv' AS row
MATCH (f1:File {id: row.file_a})
MATCH (f2:File {id: row.file_b})
MERGE (f1)-[r:COCHANGES]->(f2)
SET r.cochange_count = toInteger(row.cochange_count),
    r.jaccard = toFloat(row.jaccard);
```

## 可视化提示

- 使用 Neo4j Bloom 或 Browser 执行 `MATCH (p:Person)-[r:TOUCHES]->(f:File) RETURN p,r,f`。
- 用 `f.sensitivity_score > 0` 过滤，以突出与安全相关的聚类。
- 对 Gephi，将 `edges.csv` 导入为边，`people.csv` / `files.csv` 作为节点导入。
