#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
滴答清单任务快速获取脚本
如果您已经有访问令牌，可以使用此脚本快速获取任务数据
"""

import requests
import json
from datetime import datetime
import os
from typing import Dict, List, Optional

def get_tasks(access_token):
    """获取任务列表 - 通过项目获取"""
    # 首先获取所有项目
    projects = get_projects(access_token)
    if not projects:
        print("❌ 无法获取项目列表")
        return None
    
    all_tasks = []
    
    # 为每个项目获取任务数据
    for project in projects:
        project_id = project.get('id')
        if not project_id:
            continue
            
        project_tasks = get_project_tasks(access_token, project_id)
        if project_tasks:
            all_tasks.extend(project_tasks)
    
    print(f"✅ 成功获取任务数据，共 {len(all_tasks)} 个任务")
    return all_tasks

def get_project_tasks(access_token, project_id):
    """获取指定项目的任务"""
    base_url = "https://api.dida365.com/open/v1"
    project_data_url = f"{base_url}/project/{project_id}/data"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'OAuth-Client',
        'Cache-Control': 'no-cache'
    }
    
    try:
        response = requests.get(project_data_url, headers=headers)
        print(f"获取项目 {project_id} 任务请求状态: {response.status_code}")
        
        if response.status_code == 200:
            project_data = response.json()
            tasks = project_data.get('tasks', [])
            print(f"✅ 项目 {project_id} 包含 {len(tasks)} 个任务")
            return tasks
        else:
            print(f"❌ 获取项目 {project_id} 任务失败: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ 获取项目 {project_id} 任务时发生错误: {str(e)}")
        return None

def get_projects(access_token):
    """
    使用访问令牌获取项目信息
    """
    base_url = "https://api.dida365.com/open/v1"
    projects_url = f"{base_url}/project"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'OAuth-Client',
        'Cache-Control': 'no-cache'
    }
    
    try:
        response = requests.get(projects_url, headers=headers)
        print(f"获取项目请求状态: {response.status_code}")
        
        if response.status_code == 200:
            projects_data = response.json()
            print(f"✅ 成功获取项目数据，共 {len(projects_data)} 个项目")
            return projects_data
        else:
            print(f"❌ 获取项目失败: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ 获取项目时发生错误: {str(e)}")
        return None

def format_tasks_for_ai(tasks: List[Dict], projects: List[Dict] = None) -> str:
    """
    格式化任务数据供AI使用 - 简洁层级列表格式
    """
    if not tasks:
        return "没有找到任务数据"
    
    # 创建项目ID到名称的映射
    project_map = {}
    if projects:
        for project in projects:
            project_map[project.get('id', '')] = project.get('name', '未知项目')
    
    # 按项目分组任务
    project_tasks = {}
    for task in tasks:
        project_id = task.get('projectId', '')
        project_name = project_map.get(project_id, '收集箱')
        if project_name not in project_tasks:
            project_tasks[project_name] = {'pending': [], 'completed': []}
        
        if task.get('status') == 0:  # 0表示未完成
            project_tasks[project_name]['pending'].append(task)
        else:
            project_tasks[project_name]['completed'].append(task)
    
    # 统计信息
    total_pending = sum(len(proj['pending']) for proj in project_tasks.values())
    total_completed = sum(len(proj['completed']) for proj in project_tasks.values())
    # 聚合所有已完成任务，供后续“最近完成的任务”展示
    completed_tasks = [t for proj in project_tasks.values() for t in proj['completed']]
    
    formatted_output = []
    formatted_output.append(f"# 滴答清单任务报告")
    formatted_output.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    formatted_output.append(f"总任务数: {len(tasks)} (未完成: {total_pending}, 已完成: {total_completed})")
    formatted_output.append("\n" + "="*50 + "\n")
    
    # 按项目输出任务
    for project_name, project_data in project_tasks.items():
        if not project_data['pending'] and not project_data['completed']:
            continue
            
        formatted_output.append(f"## {project_name}")
        
        # 未完成任务
        if project_data['pending']:
            formatted_output.append(f"### 📋 未完成 ({len(project_data['pending'])}个)")
            for task in project_data['pending']:
                title = task.get('title', '无标题')
                priority = task.get('priority', 0)
                due_date = task.get('dueDate', '')
                
                # 优先级映射：高中低无 -> 重要紧急、重要不紧急、不重要紧急、不重要不紧急
                priority_text = {
                    5: '(重要紧急)',
                    3: '(重要不紧急)', 
                    1: '(不重要紧急)',
                    0: '(不重要不紧急)'
                }.get(priority, '(不重要不紧急)')
                
                # 简化时间格式：只显示日期
                due_text = f" 📅{due_date[:10]}" if due_date else ""
                
                formatted_output.append(f"- {title} {priority_text}{due_text}")
        
        # 已完成任务
        if project_data['completed']:
            formatted_output.append(f"### ✅ 已完成 ({len(project_data['completed'])}个)")
            for task in project_data['completed']:
                title = task.get('title', '无标题')
                formatted_output.append(f"- ~~{title}~~")
        
        formatted_output.append("")
    
    # 输出已完成任务统计
    formatted_output.append(f"## 已完成任务 ({total_completed}个)")
    formatted_output.append("")
    
    if completed_tasks:
        formatted_output.append("最近完成的任务:")
        for task in completed_tasks[:5]:  # 只显示最近5个
            title = task.get('title', '无标题')
            formatted_output.append(f"- {title}")
    
    return "\n".join(formatted_output)

def save_to_file(content: str, filename: str = None) -> str:
    """
    保存内容到文件
    """
    if not filename:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"dida_tasks_{timestamp}.md"
    
    filepath = os.path.join(os.getcwd(), filename)
    
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ 任务数据已保存到: {filepath}")
        return filepath
    except Exception as e:
        print(f"❌ 保存文件时发生错误: {str(e)}")
        return ""

def main():
    """
    主函数 - 快速获取任务
    """
    print("🚀 滴答清单任务快速获取脚本")
    print("="*50)
    
    # 获取访问令牌
    print("📝 请输入您的访问令牌 (Access Token):")
    access_token = input("访问令牌: ").strip()
    
    if not access_token:
        print("❌ 未输入访问令牌，程序退出")
        print("💡 提示: 如果您还没有访问令牌，请运行 dida_task_fetcher.py 进行完整的OAuth授权流程")
        return
    
    # 获取项目数据
    print("\n📁 正在获取项目数据...")
    projects = get_projects(access_token)
    
    # 获取任务数据
    print("\n📋 正在获取任务数据...")
    tasks = get_tasks(access_token)
    
    if not tasks:
        print("❌ 获取任务数据失败")
        print("💡 可能的原因:")
        print("   - 访问令牌已过期")
        print("   - 访问令牌无效")
        print("   - 网络连接问题")
        print("   - API权限不足")
        return
    
    # 格式化任务数据
    print("\n📝 正在格式化任务数据...")
    formatted_content = format_tasks_for_ai(tasks, projects)
    
    # 保存到文件
    print("\n💾 正在保存任务数据...")
    filepath = save_to_file(formatted_content)
    
    if filepath:
        print(f"\n✅ 任务获取完成！")
        print(f"📄 文件路径: {filepath}")
        print(f"\n📊 任务统计:")
        print(f"- 总任务数: {len(tasks)}")
        pending_count = len([t for t in tasks if t.get('status') == 0])
        completed_count = len(tasks) - pending_count
        print(f"- 未完成: {pending_count}")
        print(f"- 已完成: {completed_count}")
        
        print(f"\n🤖 您现在可以将生成的文件内容发送给AI来整理每日清单")
        
        # 显示部分内容预览
        print(f"\n📋 内容预览:")
        print("-" * 30)
        lines = formatted_content.split('\n')
        for line in lines[:10]:  # 显示前10行
            print(line)
        if len(lines) > 10:
            print("...")
            print(f"(还有 {len(lines) - 10} 行内容)")
    else:
        print("❌ 保存文件失败")

if __name__ == "__main__":
    main()