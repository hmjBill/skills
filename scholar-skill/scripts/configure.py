#!/usr/bin/env python3
"""
ScholarSkill 配置脚本
自动检测和配置 Obsidian 路径、依赖技能等

支持三种模式：
- auto: 全自动配置（推荐）
- semi: 半自动配置（用户确认）
- manual: 手动配置（高级用户）
"""

import argparse
import sys
import yaml
from pathlib import Path
from typing import Optional, Dict, List

# 颜色输出
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text.center(60)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")

def print_success(text: str):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_warning(text: str):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_error(text: str):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text: str):
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")

SKILL_ROOT = Path(__file__).resolve().parents[1]
LANGUAGE_CODE = "zh-CN"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="配置 ScholarSkill Obsidian 工作流")
    parser.add_argument("mode", nargs="?", default="auto", choices=["auto", "semi", "manual"])
    parser.add_argument("--vault-path", dest="vault_path", help="显式指定目标 Obsidian vault 路径")
    return parser.parse_args()

# 检测 Obsidian 仓库
def detect_obsidian_vault() -> Optional[str]:
    """自动检测 Obsidian 仓库位置"""
    print_info("正在检测 Obsidian 仓库...")
    
    # 常见路径
    common_paths = [
        Path.home() / "ObsidianVault",
        Path.home() / "Documents" / "ObsidianVault",
        Path.home() / "obsidian-vault",
        Path.home() / "knowledge-base",
        Path.home() / "second-brain",
    ]
    
    # 检查常见路径
    for path in common_paths:
        if path.exists() and (path / ".obsidian").exists():
            print_success(f"找到 Obsidian 仓库：{path}")
            return str(path)
    
    # 尝试查找包含 .obsidian 文件夹的目录
    print_info("在常用目录中搜索...")
    search_dirs = [
        Path.home() / "Documents",
        Path.home(),
        Path("/Volumes"),  # macOS 外接驱动器
    ]
    
    for search_dir in search_dirs:
        if search_dir.exists():
            try:
                for item in search_dir.rglob(".obsidian"):
                    vault_path = item.parent
                    if vault_path != search_dir:  # 排除根目录
                        print_success(f"找到 Obsidian 仓库：{vault_path}")
                        return str(vault_path)
            except PermissionError:
                continue
    
    print_warning("未自动检测到 Obsidian 仓库")
    return None

# 检测依赖技能
def check_dependencies() -> Dict[str, bool]:
    """检查依赖技能是否已安装"""
    print_info("正在检查依赖技能...")
    
    dependencies = {
        'arxiv-watcher': False,
        'academic-research-hub': False,
        'obsidian-direct': False,
        'obsidian-cli': False,  # 新增
        'tavily': False,
        'pdf': False,
        'durable-task-runner': False,  # 长任务编排
    }
    
    skills_dir = Path.home() / ".openclaw" / "workspace-scholar" / "skills"
    if not skills_dir.exists():
        skills_dir = Path.home() / ".openclaw" / "workspace" / "skills"
    
    if skills_dir.exists():
        for dep in dependencies.keys():
            dep_path = skills_dir / dep
            if dep_path.exists():
                dependencies[dep] = True
                if dep == 'durable-task-runner':
                    print_success(f"  ✓ {dep} 已安装（长任务编排）")
                else:
                    print_success(f"  ✓ {dep} 已安装")
            else:
                if dep == 'durable-task-runner':
                    print_warning(f"  ✗ {dep} 未安装（L3 精读/批量处理推荐）")
                elif dep == 'obsidian-cli':
                    print_warning(f"  ✗ {dep} 未安装（Obsidian CLI 工具）")
                else:
                    print_warning(f"  ✗ {dep} 未安装")
    else:
        print_error(f"Skills 目录不存在：{skills_dir}")
    
    return dependencies

# 创建 Obsidian 目录结构
def create_obsidian_structure(vault_path: str) -> bool:
    """在 Obsidian 仓库中创建所需的目录结构"""
    print_info("正在创建 Obsidian 目录结构...")
    
    vault = Path(vault_path)
    directories = [
        vault / "0-Inbox",
        vault / "1-Papers" / "By-Topic",
        vault / "1-Papers" / "By-Year",
        vault / "1-Papers" / "To-Process",
        vault / "2-Knowledge" / "Concepts",
        vault / "2-Knowledge" / "Insights",
        vault / "2-Knowledge" / "Methods",
        vault / "2-Knowledge" / "Questions",
        vault / "2-Knowledge" / "People",
        vault / "3-MOCs",
        vault / "4-Applications",
        vault / "4-Surveys",
        vault / "4-Outputs" / "Reflections",
        vault / "4-Outputs" / "Reflections" / "L1",
        vault / "4-Outputs" / "Reflections" / "L2",
        vault / "4-Outputs" / "Reflections" / "L3",
        vault / "4-Outputs" / "Confirmation-Records",
        vault / "4-Outputs" / "Drafts",
        vault / "4-Outputs" / "Literature-Reviews",
        vault / "9-Templates",
        vault / "memory" / "semantic",
        vault / "memory" / "episodic",
        vault / "memory" / "inbox",
    ]
    
    try:
        for directory in directories:
            if not directory.exists():
                directory.mkdir(parents=True, exist_ok=True)
                print_success(f"  创建目录：{directory.relative_to(vault)}")
            else:
                print_info(f"  已存在：{directory.relative_to(vault)}")
        
        print_success("Obsidian 目录结构创建完成")
        return True
    except Exception as e:
        print_error(f"创建目录失败：{e}")
        return False


def sync_templates_to_vault(vault_path: str) -> bool:
    """将技能包中的模板同步到 Obsidian 仓库的语言隔离模板目录"""
    print_info("正在同步模板到 Obsidian 仓库...")

    source_dir = SKILL_ROOT / "templates"
    target_dir = Path(vault_path) / "9-Templates" / LANGUAGE_CODE
    target_dir.mkdir(parents=True, exist_ok=True)

    try:
        for template_file in source_dir.glob("*.md"):
            target_path = target_dir / template_file.name
            target_path.write_text(template_file.read_text(encoding="utf-8"), encoding="utf-8")
            print_success(f"  同步模板：9-Templates/{LANGUAGE_CODE}/{template_file.name}")
        return True
    except Exception as e:
        print_error(f"同步模板失败：{e}")
        return False

# 生成配置文件
def generate_config(vault_path: str, mode: str = 'auto') -> str:
    """生成配置文件"""
    print_info("正在生成配置文件...")
    
    config = {
        'obsidian': {
            'vault_path': vault_path,
            'inbox_folder': '0-Inbox',
            'paper_notes_folder': '1-Papers',
            'paper_by_topic_folder': '1-Papers/By-Topic',
            'paper_by_year_folder': '1-Papers/By-Year',
            'paper_queue_folder': '1-Papers/To-Process',
            'knowledge_folder': '2-Knowledge',
            'concepts_folder': '2-Knowledge/Concepts',
            'insights_folder': '2-Knowledge/Insights',
            'methods_folder': '2-Knowledge/Methods',
            'questions_folder': '2-Knowledge/Questions',
            'people_folder': '2-Knowledge/People',
            'moc_folder': '3-MOCs',
            'applications_folder': '4-Applications',
            'surveys_folder': '4-Surveys',
            'outputs_folder': '4-Outputs',
            'reflections_folder': '4-Outputs/Reflections',
            'confirmation_records_folder': '4-Outputs/Confirmation-Records',
            'templates_folder': f'9-Templates/{LANGUAGE_CODE}',
            'memory': {
                'semantic_folder': 'memory/semantic',
                'episodic_folder': 'memory/episodic',
                'procedural_file': 'memory/procedural.md',
                'inbox_folder': 'memory/inbox',
            }
        },
        'reading': {
            'default_level': 'L2',
            'enable_memory_extraction': True,
            'enable_knowledge_consolidation': True,
            'memory_counts': {
                'l2_semantic': '3-5',
                'l2_episodic': '1-2',
                'l2_procedural': '1',
                'l3_semantic': '5-8',
                'l3_episodic': '2-3',
                'l3_procedural': '2-3',
            },
            'priority': {
                'p0_keywords': ['CAD Generation', 'Physical AI', 'World Model'],
                'p1_keywords': ['LLM Agent', 'Reasoning', '3D Generation'],
                'p2_keywords': ['其他方向'],
            }
        },
        'notification': {
            'feishu_enabled': False,
            'feishu_user_id': '',
            'push_on': {
                'l1_complete': False,
                'l2_complete': True,
                'l3_complete': True,
                'l3_milestone': True,
            }
        },
        'consolidation': {
            'schedule': 'weekly',
            'auto_merge': True,
            'conflict_resolution': 'manual',
            'output_report': True,
            'report_day': 'Sunday',
        },
        'templates': {
            'paper_note_l1': '',
            'paper_note_l2': '',
            'paper_note_l3': '',
            'reflection_l1': f'9-Templates/{LANGUAGE_CODE}/Template-Reflection-L1.md',
            'reflection_l2': f'9-Templates/{LANGUAGE_CODE}/Template-Reflection-L2.md',
            'reflection_l3': f'9-Templates/{LANGUAGE_CODE}/Template-Reflection-L3.md',
            'confirmation_request': f'9-Templates/{LANGUAGE_CODE}/Template-Confirmation-Request.md',
            'concept': f'9-Templates/{LANGUAGE_CODE}/Template-Concept.md',
            'insight': f'9-Templates/{LANGUAGE_CODE}/Template-Insight.md',
            'method': f'9-Templates/{LANGUAGE_CODE}/Template-Method.md',
            'question': f'9-Templates/{LANGUAGE_CODE}/Template-Question.md',
            'person': f'9-Templates/{LANGUAGE_CODE}/Template-Person.md',
            'moc': f'9-Templates/{LANGUAGE_CODE}/Template-MOC.md',
            'semantic_memory': '',
            'episodic_memory': '',
            'procedural_memory': '',
        },
        'reflection': {
            'enable_reflection': True,
            'l1_after_each_paper': True,
            'l2_schedule': 'weekly',
            'l2_report_day': 'Sunday',
            'l3_schedule': 'monthly',
            'l3_requires_confirmation': True,
        },
        'confirmation': {
            'enable_human_confirmation': True,
            'high_priority_timeout_hours': 48,
            'trigger_on_new_moc': True,
            'trigger_on_core_paper': True,
            'trigger_on_many_new_concepts': True,
            'trigger_on_cognitive_conflict': True,
            'trigger_on_direction_shift': True,
        },
        'logging': {
            'level': 'info',
            'file': '~/.openclaw/workspace/logs/scholar.log',
            'verbose': False,
        },
        'advanced': {
            'batch_size': 3,
            'max_reading_time': 180,
            'api_retry_count': 3,
            'use_cache': True,
            'cache_dir': '~/.openclaw/workspace/cache/scholar',
        }
    }
    
    # 保存配置文件
    # 优先使用 workspace-scholar/config，如不存在则使用 workspace/config
    config_dir = Path.home() / ".openclaw" / "workspace-scholar" / "config"
    if not config_dir.exists():
        config_dir = Path.home() / ".openclaw" / "workspace" / "config"
    config_dir.mkdir(parents=True, exist_ok=True)
    
    config_file = config_dir / "scholar.yml"
    
    with open(config_file, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
    
    print_success(f"配置文件已生成：{config_file}")
    print_info(f"提示：配置文件优先写入 ~/.openclaw/workspace-scholar/config/（如该目录存在）")
    return str(config_file)

# 安装依赖技能
def install_dependencies(missing_deps: List[str], mode: str = 'auto'):
    """安装缺失的依赖技能"""
    if not missing_deps:
        print_success("所有依赖技能已安装")
        return
    
    print_header(f"需要安装 {len(missing_deps)} 个依赖技能")
    
    for dep in missing_deps:
        print_info(f"依赖技能：{dep}")
        
        if mode == 'auto':
            print_info(f"请通过 ClawHub 安装 {dep}...")
            print_warning(f"  运行命令：clawhub install {dep}")
        elif mode == 'semi':
            response = input(f"  是否已安装 {dep}? (y/n): ").strip().lower()
            if response == 'y':
                print_success(f"  ✓ {dep} 已安装")
            else:
                print_warning(f"  请先安装：clawhub install {dep}")
                print_info(f"  安装完成后继续...")
                input(f"  按回车键继续...")
        elif mode == 'manual':
            print_info(f"  稍后手动安装：clawhub install {dep}")

# 主配置流程
def main():
    print_header("ScholarSkill 配置向导")

    args = parse_args()
    mode = args.mode

    print_info(f"配置模式：{mode}")

    # 1. 检测 Obsidian 仓库
    vault_path = args.vault_path
    if vault_path:
        print_info(f"使用显式指定的 Obsidian 仓库：{vault_path}")
    else:
        vault_path = detect_obsidian_vault()
    
    if not vault_path:
        if mode == 'auto':
            print_error("全自动模式需要 Obsidian 仓库已存在")
            print_info("请使用半自动/手动模式，或通过 --vault-path 显式指定目标路径")
            sys.exit(1)
        else:
            vault_path = input("请输入 Obsidian 仓库路径：").strip()
    
    # 验证路径
    if not Path(vault_path).exists():
        print_error(f"路径不存在：{vault_path}")
        response = input("是否创建该目录？(y/n): ").strip().lower()
        if response == 'y':
            Path(vault_path).mkdir(parents=True, exist_ok=True)
            print_success(f"已创建目录：{vault_path}")
        else:
            print_error("配置中止")
            sys.exit(1)
    
    # 2. 创建 Obsidian 目录结构
    should_create = mode == 'auto' or (mode == 'semi' and input("\n是否创建 Obsidian 目录结构？(y/n): ").strip().lower() == 'y')
    if should_create:
        create_obsidian_structure(vault_path)
        sync_templates_to_vault(vault_path)
    
    # 3. 检查依赖技能
    dependencies = check_dependencies()
    missing_deps = [dep for dep, installed in dependencies.items() if not installed]
    
    # 4. 安装依赖
    if missing_deps:
        install_dependencies(missing_deps, mode)
    
    # 5. 生成配置文件
    config_file = generate_config(vault_path, mode)
    
    # 6. 完成
    print_header("配置完成")
    print_success(f"配置文件：{config_file}")
    print_success(f"Obsidian 仓库：{vault_path}")
    if should_create:
        print_success(f"模板已同步到 9-Templates/{LANGUAGE_CODE}/")
    
    if missing_deps:
        print_warning(f"\n还有 {len(missing_deps)} 个依赖技能需要安装:")
        for dep in missing_deps:
            print(f"  - {dep}")
        print_info("\n安装命令:")
        for dep in missing_deps:
            print(f"  clawhub install {dep}")
    
    print_info("\n下一步:")
    print("  1. 安装缺失的依赖技能（如有）")
    print("  2. 编辑配置文件（可选）: " + config_file)
    print(f"  3. 查看 9-Templates/{LANGUAGE_CODE}/ 和 0-Inbox/ 目录结构")
    print("  4. 开始使用：openclaw scholar read <论文文件/ArXiv URL>")
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    main()
