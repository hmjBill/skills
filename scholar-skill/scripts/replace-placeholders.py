#!/usr/bin/env python3
"""
占位符替换脚本
用于发布前批量替换文档中的占位符

使用方式：
python scripts/replace-placeholders.py
"""

import os
import re
from pathlib import Path
from typing import Dict

# 占位符映射（可修改）
PLACEHOLDERS: Dict[str, str] = {
    'YOUR_USERNAME': 'shengjie',  # ← 修改为你的 GitHub 用户名
    'your.email@example.com': 'your.real.email@gmail.com',  # ← 修改为你的邮箱
    'YOUR_NAMESPACE': 'shengjie',  # ← 修改为你的命名空间
}

def replace_placeholders_in_file(file_path: Path, dry_run: bool = False) -> bool:
    """替换单个文件中的占位符"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        replacements_made = 0
        
        for placeholder, replacement in PLACEHOLDERS.items():
            if placeholder in content:
                count = content.count(placeholder)
                content = content.replace(placeholder, replacement)
                replacements_made += count
                
                if dry_run:
                    print(f"  将替换 {count} 处：{placeholder} → {replacement}")
        
        if replacements_made > 0 and not dry_run:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✓ {file_path.relative_to(Path.cwd())} - 替换了 {replacements_made} 处")
            return True
        
        return False
    
    except Exception as e:
        print(f"✗ {file_path}: {e}")
        return False

def main():
    """主函数"""
    print("="*60)
    print("        ScholarSkill 占位符替换工具")
    print("="*60)
    print()
    
    # 获取脚本所在目录
    script_dir = Path(__file__).parent
    root_dir = script_dir.parent
    
    print(f"工作目录：{root_dir}")
    print()
    
    # 显示当前占位符配置
    print("当前占位符配置:")
    for placeholder, replacement in PLACEHOLDERS.items():
        print(f"  {placeholder} → {replacement}")
    print()
    
    # 询问是否继续
    response = input("是否继续？(y/n): ").strip().lower()
    if response != 'y':
        print("已取消")
        return
    
    print()
    
    # 查找所有需要替换的文件
    files_to_process = []
    for ext in ['*.md', '*.yml', '*.py']:
        files_to_process.extend(root_dir.glob(f'**/{ext}'))
    
    # 排除某些目录
    exclude_dirs = {'__pycache__', '.git', 'node_modules', '.openclaw'}
    files_to_process = [
        f for f in files_to_process 
        if not any(exclude in str(f) for exclude in exclude_dirs)
    ]
    
    print(f"找到 {len(files_to_process)} 个文件")
    print()
    
    # 先执行 dry run
    print("执行预检查...")
    print()
    
    total_replacements = 0
    files_with_placeholders = []
    
    for file_path in files_to_process:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            has_placeholder = any(ph in content for ph in PLACEHOLDERS.keys())
            if has_placeholder:
                files_with_placeholders.append(file_path)
                replace_placeholders_in_file(file_path, dry_run=True)
        except:
            continue
    
    print()
    print(f"共有 {len(files_with_placeholders)} 个文件包含占位符")
    print()
    
    # 询问是否执行实际替换
    if files_with_placeholders:
        response = input("是否执行实际替换？(y/n): ").strip().lower()
        if response == 'y':
            print()
            print("开始替换...")
            print()
            
            for file_path in files_with_placeholders:
                replace_placeholders_in_file(file_path, dry_run=False)
            
            print()
            print("="*60)
            print("替换完成！")
            print("="*60)
        else:
            print("已取消")
    else:
        print("✓ 未发现占位符，无需替换")

if __name__ == "__main__":
    main()
