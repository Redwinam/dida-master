#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
滴答清单任务获取脚本
用于获取滴答清单中的所有任务，并格式化输出供AI整理使用
"""

import requests
import json
import urllib.parse
import webbrowser
import time
from typing import Dict, List, Optional
import os
from datetime import datetime

class DidaTaskFetcher:
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = "http://localhost:8080/callback"
        self.access_token = None
        self.base_url = "https://api.dida365.com/open/v1"
        
    def get_authorization_url(self) -> str:
        """
        生成OAuth授权URL
        """
        params = {
            'scope': 'tasks:write tasks:read',
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'state': 'state'
        }
        
        auth_url = f"https://dida365.com/oauth/authorize?{urllib.parse.urlencode(params)}"
        return auth_url
    
    def get_access_token(self, authorization_code: str) -> bool:
        """
        使用授权码获取访问令牌
        """
        token_url = "https://dida365.com/oauth/token"
        
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'redirect_uri': self.redirect_uri,
            'grant_type': 'authorization_code',
            'scope': 'tasks:write tasks:read',
            'code': authorization_code
        }
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'OAuth-Client',
            'Cache-Control': 'no-cache'
        }
        
        try:
            response = requests.post(token_url, data=data, headers=headers)
            print(f"Token request status: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                token_data = response.json()
                if 'access_token' in token_data:
                    self.access_token = token_data['access_token']
                    print("✅ 成功获取访问令牌")
                    return True
                else:
                    print("❌ 响应中未找到access_token")
                    return False
            else:
                print(f"❌ 获取令牌失败: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ 获取令牌时发生错误: {str(e)}")
            return False
    
    def get_all_tasks(self) -> Optional[List[Dict]]:
        """
        获取所有任务 - 通过项目获取
        """
        if not self.access_token:
            print("❌ 未找到访问令牌，请先进行授权")
            return None
        
        # 首先获取所有项目
        projects = self.get_projects()
        if not projects:
            print("❌ 无法获取项目列表")
            return None
        
        all_tasks = []
        
        # 为每个项目获取任务数据
        for project in projects:
            project_id = project.get('id')
            if not project_id:
                continue
                
            project_tasks = self.get_project_tasks(project_id)
            if project_tasks:
                all_tasks.extend(project_tasks)
        
        print(f"✅ 成功获取任务数据，共 {len(all_tasks)} 个任务")
        return all_tasks
    
    def get_project_tasks(self, project_id: str) -> Optional[List[Dict]]:
        """
        获取指定项目的任务
        """
        project_data_url = f"{self.base_url}/project/{project_id}/data"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
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
    
    def get_projects(self) -> Optional[List[Dict]]:
        """
        获取所有项目/清单
        """
        if not self.access_token:
            print("❌ 未找到访问令牌，请先进行授权")
            return None
            
        projects_url = f"{self.base_url}/project"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
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
                print(f"✅ 成功获取项目数据")
                return projects_data
            else:
                print(f"❌ 获取项目失败: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ 获取项目时发生错误: {str(e)}")
            return None
    
    def format_tasks_for_ai(self, tasks: List[Dict], projects: List[Dict] = None) -> str:
        """
        格式化任务数据供AI使用 - 简洁的层级列表格式
        """
        if not tasks:
            return "没有找到任务数据"
        
        # 创建项目ID到名称的映射
        project_map = {}
        if projects:
            for project in projects:
                project_map[project.get('id', '')] = project.get('name', '未知项目')
        
        # 按项目分组任务
        tasks_by_project = {}
        for task in tasks:
            project_id = task.get('projectId', '')
            project_name = project_map.get(project_id, '收集箱')
            
            if project_name not in tasks_by_project:
                tasks_by_project[project_name] = {'pending': [], 'completed': []}
            
            if task.get('status') == 0:  # 0表示未完成
                tasks_by_project[project_name]['pending'].append(task)
            else:
                tasks_by_project[project_name]['completed'].append(task)
        
        formatted_output = []
        formatted_output.append(f"# 滴答清单任务报告")
        formatted_output.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 统计信息
        total_pending = sum(len(proj['pending']) for proj in tasks_by_project.values())
        total_completed = sum(len(proj['completed']) for proj in tasks_by_project.values())
        formatted_output.append(f"总任务数: {total_pending + total_completed} (未完成: {total_pending}, 已完成: {total_completed})")
        formatted_output.append("")
        
        # 按项目输出任务
        for project_name in sorted(tasks_by_project.keys()):
            project_data = tasks_by_project[project_name]
            pending_tasks = project_data['pending']
            completed_tasks = project_data['completed']
            
            if pending_tasks or completed_tasks:
                formatted_output.append(f"## {project_name}")
                
                # 未完成任务
                if pending_tasks:
                    formatted_output.append(f"### 📋 未完成 ({len(pending_tasks)}个)")
                    for task in pending_tasks:
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
                    formatted_output.append("")
                
                # 已完成任务
                if completed_tasks:
                    formatted_output.append(f"### ✅ 已完成 ({len(completed_tasks)}个)")
                    for task in completed_tasks:
                        title = task.get('title', '无标题')
                        formatted_output.append(f"- ✅ {title}")
                    formatted_output.append("")
        
        return "\n".join(formatted_output)
    
    def save_to_file(self, content: str, filename: str = None) -> str:
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
    主函数
    """
    # 配置信息
    CLIENT_ID = "xETpHE1Tc1MxZsHN22"
    CLIENT_SECRET = "+_@z&iUMuX2O0jbi2x3wmd!#OPr6*Ilv"
    
    print("🚀 滴答清单任务获取脚本启动")
    print("="*50)
    
    # 创建获取器实例
    fetcher = DidaTaskFetcher(CLIENT_ID, CLIENT_SECRET)
    
    # 生成授权URL
    auth_url = fetcher.get_authorization_url()
    print(f"📋 请访问以下URL进行授权:")
    print(auth_url)
    print("\n⚠️  注意: 由于这是命令行脚本，您需要手动复制授权后的回调URL中的code参数")
    
    # 显示手动授权指导
    print("\n🔗 请手动复制以下URL到浏览器中进行授权:")
    print(f"\n{auth_url}\n")
    print("📋 操作步骤:")
    print("1. 复制上述URL")
    print("2. 在浏览器中打开")
    print("3. 登录滴答清单账号")
    print("4. 点击授权按钮")
    print("5. 复制回调URL中的code参数")
    
    # 尝试自动打开浏览器（可选）
    try:
        webbrowser.open(auth_url)
        print("\n🌐 同时已尝试自动打开浏览器")
    except Exception as e:
        print(f"\n⚠️  自动打开浏览器失败: {e}")
    
    # 等待用户输入授权码
    print("\n📝 授权完成后，请从回调URL中复制code参数并粘贴到下方:")
    print("💡 回调URL格式: http://localhost:8080/callback?code=YOUR_CODE&state=state")
    authorization_code = input("授权码 (code): ").strip()
    
    if not authorization_code:
        print("❌ 未输入授权码，程序退出")
        return
    
    # 获取访问令牌
    print("\n🔑 正在获取访问令牌...")
    if not fetcher.get_access_token(authorization_code):
        print("❌ 获取访问令牌失败，程序退出")
        return
    
    # 获取项目数据
    print("\n📁 正在获取项目数据...")
    projects = fetcher.get_projects()
    
    # 获取任务数据
    print("\n📋 正在获取任务数据...")
    tasks = fetcher.get_all_tasks()
    
    if not tasks:
        print("❌ 获取任务数据失败")
        return
    
    # 格式化任务数据
    print("\n📝 正在格式化任务数据...")
    formatted_content = fetcher.format_tasks_for_ai(tasks, projects)
    
    # 保存到文件
    print("\n💾 正在保存任务数据...")
    filepath = fetcher.save_to_file(formatted_content)
    
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
    else:
        print("❌ 保存文件失败")

if __name__ == "__main__":
    main()