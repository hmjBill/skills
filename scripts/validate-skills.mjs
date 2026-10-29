#!/usr/bin/env node
// 校验仓库内每个 skill 的 SKILL.md 是否符合本仓库约定。
// 用法：node scripts/validate-skills.mjs
// 退出码：0 通过；1 有错误。
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
// 不是 skill 的顶层目录
const NON_SKILL_DIRS = new Set([".git", ".github", "node_modules", "scripts", "prompts"]);
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SKIP_WALK = new Set([".git", "node_modules"]);
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_WALK.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** 取出 frontmatter 的顶层 key: value（够用即可，不引 YAML 依赖）。 */
function parseFrontmatter(text, where) {
  if (text.charCodeAt(0) === 0xfeff) err(where, "BOM 不允许");
  // 统一换行：仓库工作区在 Windows 上为 CRLF，不归一化会让最后一行带 \r 而匹配失败。
  const body = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!body.startsWith("---\n")) {
    err(where, "首行必须是 ---");
    return null;
  }
  const end = body.indexOf("\n---", 3);
  if (end === -1) {
    err(where, "frontmatter 未闭合");
    return null;
  }
  const fields = {};
  for (const line of body.slice(4, end).split("\n")) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (m) fields[m[1]] = m[2].trim();
  }
  return fields;
}

function checkSkill(dirName) {
  const file = join(ROOT, dirName, "SKILL.md");
  if (!existsSync(file)) {
    err(dirName, "缺少 SKILL.md");
    return;
  }
  const fields = parseFrontmatter(readFileSync(file, "utf8"), dirName);
  if (!fields) return;

  const name = (fields.name ?? "").replace(/^["']|["']$/g, "");
  if (!name) err(dirName, "缺少 name");
  else if (name !== dirName) err(dirName, `name=${name} 与目录名不一致`);
  else if (!NAME_RE.test(name)) err(dirName, `name=${name} 不符合 kebab-case`);

  const desc = fields.description ?? "";
  if (!desc) err(dirName, "缺少 description");
  else if (/^[[{]/.test(desc)) err(dirName, "description 被写成非字符串（列表/对象）");
  else if (desc.length > 1024) err(dirName, `description 过长（${desc.length} > 1024）`);
}

// 1) 每个顶层目录必须是 skill（少数基础设施目录除外）
for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
  if (!entry.isDirectory() || NON_SKILL_DIRS.has(entry.name)) continue;
  checkSkill(entry.name);
}

// 2) 所有 .sh 必须 LF（CRLF 会让 Git Bash 报 bad interpreter）
for (const file of walk(ROOT)) {
  if (!file.endsWith(".sh")) continue;
  if (readFileSync(file, "utf8").includes("\r\n")) err(relative(ROOT, file), "含 CRLF，应为 LF");
}

// 3) README 的收录条目数与实际目录数一致
const readmePath = join(ROOT, "README.md");
if (existsSync(readmePath)) {
  const readme = readFileSync(readmePath, "utf8");
  const m = /收录条目（(\d+)\s*个/.exec(readme);
  if (m) {
    const actual = readdirSync(ROOT, { withFileTypes: true }).filter(
      (e) => e.isDirectory() && !NON_SKILL_DIRS.has(e.name) && statSync(join(ROOT, e.name)).isDirectory(),
    ).length;
    if (Number(m[1]) !== actual) err("README.md", `收录条目写 ${m[1]} 个，实际 ${actual} 个`);
  }
}

if (errors.length) {
  console.error(`skills 校验失败（${errors.length} 项）：`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log("skills 校验通过");
