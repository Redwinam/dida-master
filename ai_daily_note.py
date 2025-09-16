#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
每日AI日程生成与滴答清单笔记创建服务
- 从滴答清单获取任务（过滤指定项目名，例如“日记”）
- 使用大模型根据任务生成当日日程与建议
- 通过滴答清单API创建一条笔记（任务）到指定项目
- 标题为“YYYY年M月D日”的中文日期，日期为当日
环境变量：
- DIDA_TOKEN            滴答清单访问令牌（必需）
- DIDA_PROJECT_ID       用于创建“每日笔记”的项目ID（必需，通过环境变量提供）
- EXCLUDE_PROJECT_NAME  需要过滤掉的项目名（默认：日记）
- LLM_API_KEY           大模型服务API密钥（必需）
- LLM_MODEL             模型名称（默认：deepseek-ai/DeepSeek-V3.1）
- LLM_API_URL           大模型服务URL（默认：https://api.siliconflow.cn/v1/chat/completions）
"""
import os
import sys
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import List, Dict, Optional
import requests

# 复用快速获取脚本中的工具函数
import quick_fetch_tasks as qft

LLM_API_URL = os.getenv("LLM_API_URL", "https://api.siliconflow.cn/v1/chat/completions")

USER_PROMPT = (
    "你是一个高效的时间管理专家，专门为INTJ人格类型设计日程安排。\n"
    "请根据以下任务列表，为我制定今天的日程安排。并提供一些针对各项任务与一天具体的专业建议。"
    "（但回复中无需提到INTJ属性；返回格式中不使用表格）"
)


def zh_cn_date_today() -> str:
    now = datetime.now(ZoneInfo("Asia/Shanghai"))
    return f"{now.year}年{now.month}月{now.day}日"


def iso_datetime(date_only: bool = False, start_of_day: bool = True) -> str:
    """返回当前日期/时间的ISO字符串，带本地时区偏移。"""
    now = datetime.now(ZoneInfo("Asia/Shanghai"))
    if date_only:
        dt = datetime(now.year, now.month, now.day, 0 if start_of_day else 23, 59 if not start_of_day else 0, 0, tzinfo=ZoneInfo("Asia/Shanghai"))
    else:
        dt = now
    return dt.strftime("%Y-%m-%dT%H:%M:%S%z")


def fetch_all_tasks_filtered(token: str, exclude_project_name: str) -> tuple[list[Dict], list[Dict]]:
    """获取所有项目与任务，并过滤掉指定项目名的任务。返回 (tasks, projects)"""
    projects = qft.get_projects(token) or []
    if not projects:
        print("❌ 无法获取项目列表")
        return [], []

    # 过滤需要排除的项目
    filtered_projects = [p for p in projects if p.get('name') != exclude_project_name]

    all_tasks: list[Dict] = []
    for p in filtered_projects:
        pid = p.get('id')
        if not pid:
            continue
        tasks = qft.get_project_tasks(token, pid) or []
        all_tasks.extend(tasks)

    return all_tasks, filtered_projects


def build_ai_messages(tasks_markdown: str) -> list[Dict]:
    return [
        {"role": "system", "content": "You are an expert time management assistant."},
        {"role": "user", "content": USER_PROMPT + "\n\n以下是今天的任务列表：\n\n" + tasks_markdown},
    ]


def call_siliconflow(api_key: str, model: str, messages: list[Dict]) -> Optional[str]:
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        # 可按需设置其他参数，如 temperature/top_p 等
    }
    try:
        resp = requests.post(LLM_API_URL, headers=headers, data=json.dumps(payload), timeout=60)
        if resp.status_code not in (200, 201):
            print(f"❌ 大模型请求失败: {resp.status_code} - {resp.text}")
            return None
        data = resp.json()
        # 兼容OpenAI风格
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        return content
    except Exception as e:
        print(f"❌ 调用大模型API出错: {e}")
        return None


def create_dida_note(token: str, project_id: str, title: str, content: str) -> bool:
    base_url = "https://api.dida365.com/open/v1"
    create_url = f"{base_url}/task"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'OAuth-Client',
        'Cache-Control': 'no-cache'
    }

    # 设置为当日全天
    start_date = iso_datetime(date_only=True, start_of_day=True)
    due_date = iso_datetime(date_only=True, start_of_day=False)

    payload = {
        "title": title,
        "content": content,
        "projectId": project_id,
        "isAllDay": True,
        "startDate": start_date,
        "dueDate": due_date,
        "timeZone": "Asia/Shanghai",
        "kind": "NOTE"
        # 可按需设置 priority/reminders 等
    }
    try:
        resp = requests.post(create_url, headers=headers, data=json.dumps(payload), timeout=30)
        print(f"创建笔记请求状态: {resp.status_code}")
        if resp.status_code in (200, 201):
            print("✅ 笔记创建成功")
            return True
        else:
            print(f"❌ 笔记创建失败: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"❌ 创建笔记时发生错误: {e}")
        return False


def main():
    dida_token = os.getenv("DIDA_TOKEN", "").strip()
    if not dida_token:
        print("❌ 缺少环境变量 DIDA_TOKEN")
        sys.exit(1)

    llm_api_key = os.getenv("LLM_API_KEY", "").strip()
    if not llm_api_key:
        print("❌ 缺少环境变量 LLM_API_KEY")
        sys.exit(1)

    dida_project_id = os.getenv("DIDA_PROJECT_ID", "").strip()
    if not dida_project_id:
        print("❌ 缺少环境变量 DIDA_PROJECT_ID")
        sys.exit(1)

    exclude_project = os.getenv("EXCLUDE_PROJECT_NAME", "日记").strip()
    model = os.getenv("LLM_MODEL", "deepseek-ai/DeepSeek-V3.1").strip()

    print("🚀 开始生成每日AI日程并创建滴答清单笔记")
    print("=" * 50)

    # 1) 获取任务（过滤“日记”项目）
    print("📁 正在获取任务数据...")
    tasks, projects = fetch_all_tasks_filtered(dida_token, exclude_project)
    if not tasks:
        print("❌ 没有可用任务，流程结束")
        sys.exit(1)

    # 2) 生成任务报告（简洁层级列表），供AI使用
    print("📝 正在生成任务列表...（供AI参考）")
    tasks_markdown = qft.format_tasks_for_ai(tasks, projects)

    # 3) 调用大模型生成当日计划
    print("🤖 正在调用大模型生成当日计划...")
    messages = build_ai_messages(tasks_markdown)
    ai_plan = call_siliconflow(llm_api_key, model, messages)
    if not ai_plan:
        print("❌ AI生成失败，流程结束")
        sys.exit(1)

    # 4) 创建滴答清单笔记
    title = zh_cn_date_today()
    print(f"🗒️  正在创建滴答清单笔记: {title}")
    ok = create_dida_note(dida_token, dida_project_id, title, ai_plan)
    if not ok:
        print("❌ 创建笔记失败")
        sys.exit(1)

    # 可选：保存本地备份
    ts = datetime.now(ZoneInfo("Asia/Shanghai")).strftime('%Y%m%d_%H%M%S')
    with open(f"ai_daily_plan_{ts}.md", "w", encoding="utf-8") as f:
        f.write(f"# {title} 每日日程\n\n" + ai_plan)
    print("📦 已保存本地备份")

    print("✅ 全流程完成！")


if __name__ == "__main__":
    main()