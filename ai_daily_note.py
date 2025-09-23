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
- LLM_API_URL           大模型服务URL（默认https://api.siliconflow.cn/v1/chat/completions）
- CAL_ENABLE            是否启用日历（默认false，不启用时不拉取）
- CAL_PROVIDER          日历提供方（目前只支持 icloud）
- ICLOUD_USERNAME       iCloud 邮箱（CalDAV）
- ICLOUD_APP_PASSWORD   iCloud 应用专用密码（CalDAV）
- CALENDAR_NAME         指定某个日历名（留空表示全部）
- CAL_LOOKAHEAD_DAYS    向后查看的天数（默认0，仅今天）
- CAL_MAX_EVENTS        最多注入事件条数（默认50）
- CAL_TIMEZONE          解析与展示时区（默认 Asia/Shanghai）
"""
import os
import sys
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import List, Dict, Optional
import requests
import csv
import re

# 复用快速获取脚本中的工具函数
import quick_fetch_tasks as qft

# 可选导入 caldav
try:
    import caldav
    from caldav.elements import dav, cdav
    import vobject
except Exception:
    caldav = None
    vobject = None

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
    """获取所有项目与任务，并过滤掉指定项目名的任务。返回 (tasks, projects)
    - 现在强制格式：英文逗号分隔，且每个项目名必须用双引号包裹。
    - 示例：EXCLUDE_PROJECT_NAME='"日记","杂物"'
    - 若项目名本身包含英文逗号、空格或其他标点，也请用双引号包裹即可。
    """
    projects = qft.get_projects(token) or []
    if not projects:
        print("❌ 无法获取项目列表")
        return [], []

    # 严格校验：必须为 "name","name2" 这样的双引号包裹 + 英文逗号分隔格式
    pattern = r'^\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*$'
    if exclude_project_name.strip() and not re.match(pattern, exclude_project_name):
        print("❌ 环境变量 EXCLUDE_PROJECT_NAME 格式不正确。请使用英文逗号分隔，且每个项目名必须用双引号包裹。")
        print("   示例：EXCLUDE_PROJECT_NAME='\"日记\",\"杂物\"'")
        sys.exit(1)

    # 使用 CSV 解析器解析（会自动移除双引号包裹）
    try:
        items = next(csv.reader([exclude_project_name or ""], skipinitialspace=True))
    except StopIteration:
        items = []
    excludes = set(n.strip() for n in items if n and n.strip())

    # 过滤需要排除的项目
    filtered_projects = [p for p in projects if p.get('name') not in excludes]

    all_tasks: list[Dict] = []
    for p in filtered_projects:
        pid = p.get('id')
        if not pid:
            continue
        tasks = qft.get_project_tasks(token, pid) or []
        all_tasks.extend(tasks)

    return all_tasks, filtered_projects


def format_events_markdown(events: List[Dict], tz: ZoneInfo) -> str:
    # 按天分组展示（支持 CAL_LOOKAHEAD_DAYS），若某天无事件则明确标注“无”
    lookahead = int(os.getenv("CAL_LOOKAHEAD_DAYS", "0").strip() or 0)
    today = datetime.now(tz).date()
    days = [today + timedelta(days=i) for i in range(lookahead + 1)]

    lines: List[str] = []
    for day in days:
        lines.append(f"{day.year}年{day.month}月{day.day}日行程：")
        # 找出与该天有时间交集的事件（考虑跨天）
        day_events: List[Dict] = []
        for e in (events or []):
            start: datetime = e.get("start")
            end: datetime = e.get("end")
            if not start or not end:
                continue
            s_local = start.astimezone(tz)
            e_local = end.astimezone(tz)
            if s_local.date() <= day <= e_local.date():
                day_events.append({**e, "start": s_local, "end": e_local})

        if not day_events:
            lines.append("- 无")
        else:
            # 与原逻辑保持一致：先按是否全天，再按开始时间
            day_events.sort(key=lambda x: (x.get("all_day", False), x.get("start")))
            for ev in day_events:
                title = ev.get("title") or "(无标题)"
                location = ev.get("location")
                all_day = ev.get("all_day", False)
                if all_day:
                    lines.append(f"- 全天：{title}{'（'+location+'）' if location else ''}")
                else:
                    lines.append(f"- {ev['start'].strftime('%H:%M')} - {ev['end'].strftime('%H:%M')} {title}{'（'+location+'）' if location else ''}")
        lines.append("")  # 空行分隔

    return "\n".join(lines).strip()


def build_ai_messages(tasks_markdown: str, schedule_md: Optional[str]) -> list[Dict]:
    prefix = (schedule_md + "\n\n") if schedule_md else ""
    return [
        {"role": "system", "content": "You are an expert time management assistant."},
        {"role": "user", "content": prefix + USER_PROMPT + "\n\n以下是今天的任务列表：\n\n" + tasks_markdown},
    ]


def call_llm(api_key: str, model: str, messages: list[Dict]) -> Optional[str]:
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


def get_env_bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).strip().lower() in ("1", "true", "yes", "y", "on")


def fetch_calendar_events() -> Optional[List[Dict]]:
    """拉取 iCloud CalDAV 日历事件（若启用）。返回标准化事件列表。"""
    if not get_env_bool("CAL_ENABLE", False):
        return None
    provider = os.getenv("CAL_PROVIDER", "icloud").strip().lower()
    if provider != "icloud":
        print(f"⚠️ 暂不支持的 CAL_PROVIDER: {provider}")
        return None
    if caldav is None:
        print("⚠️ 未安装 caldav/vobject 库，无法启用日历功能")
        return None

    username = os.getenv("ICLOUD_USERNAME", "").strip()
    password = os.getenv("ICLOUD_APP_PASSWORD", "").strip()
    cal_name = os.getenv("CALENDAR_NAME", "").strip()
    tz_name = os.getenv("CAL_TIMEZONE", os.getenv("TZ", "Asia/Shanghai")).strip()
    lookahead = int(os.getenv("CAL_LOOKAHEAD_DAYS", "0").strip() or 0)
    max_events = int(os.getenv("CAL_MAX_EVENTS", "50").strip() or 50)

    if not username or not password:
        print("⚠️ 缺少 ICLOUD_USERNAME/ICLOUD_APP_PASSWORD，跳过日历拉取")
        return None

    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("Asia/Shanghai")

    # 计算时间范围：今天 00:00 到 今天+lookahead 23:59
    now = datetime.now(tz)
    start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=tz)
    end_day = now + timedelta(days=lookahead)
    end = datetime(end_day.year, end_day.month, end_day.day, 23, 59, 59, tzinfo=tz)

    try:
        # iCloud CalDAV 根 URL 通常为 https://caldav.icloud.com/
        client = caldav.DAVClient(url="https://caldav.icloud.com/", username=username, password=password)
        principal = client.principal()
        calendars = principal.calendars()
        if not calendars:
            print("⚠️ 未发现任何日历")
            return []

        selected = []
        for c in calendars:
            try:
                props = c.get_properties([dav.DisplayName()])
                display = str(props.get(dav.DisplayName, "")).strip()
            except Exception:
                display = ""
            if (not cal_name) or (display == cal_name):
                selected.append((c, display))

        if not selected:
            print(f"⚠️ 未匹配到日历名称：{cal_name}，将读取全部日历")
            selected = [(c, None) for c in calendars]

        results: List[Dict] = []
        for c, display in selected:
            try:
                events = c.date_search(start, end)
            except Exception as e:
                print(f"⚠️ 搜索日历事件失败（{display or '未命名'}）：{e}")
                continue
            for ev in events:
                try:
                    raw = ev.vobject_instance
                    if not raw:
                        # 兜底：有些实现需自己解析
                        data = ev.data
                        raw = vobject.readOne(data) if data else None
                    if not raw or not hasattr(raw, 'vevent'):
                        continue
                    ve = raw.vevent
                    summary = str(getattr(ve, 'summary', None) and ve.summary.value) if hasattr(ve, 'summary') else None
                    location = str(getattr(ve, 'location', None) and ve.location.value) if hasattr(ve, 'location') else None
                    # 处理 DTSTART/DTEND，可能是 date 或 datetime
                    dtstart = getattr(ve, 'dtstart', None)
                    dtend = getattr(ve, 'dtend', None)
                    if not dtstart:
                        continue
                    start_val = dtstart.value
                    end_val = dtend.value if dtend else start_val
                    all_day = False
                    if isinstance(start_val, datetime):
                        sdt = start_val
                    else:
                        # date -> 全天
                        sdt = datetime(start_val.year, start_val.month, start_val.day, 0, 0, 0, tzinfo=tz)
                        all_day = True
                    if isinstance(end_val, datetime):
                        edt = end_val
                    else:
                        edt = datetime(end_val.year, end_val.month, end_val.day, 23, 59, 59, tzinfo=tz)
                        all_day = True
                    results.append({
                        "title": summary or "(无标题)",
                        "location": location,
                        "start": sdt,
                        "end": edt,
                        "all_day": all_day,
                        "calendar": display or "(未命名)"
                    })
                except Exception as e:
                    print(f"⚠️ 解析事件失败：{e}")
                    continue

        # 排序并截断
        results.sort(key=lambda x: (x.get("all_day", False), x.get("start")))
        if len(results) > max_events:
            results = results[:max_events]
        return results
    except Exception as e:
        print(f"⚠️ CalDAV 读取失败：{e}")
        return None


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

    # 0) 可选：拉取 iCloud 日历
    schedule_md: Optional[str] = None
    events = fetch_calendar_events()
    if events is not None:
        try:
            tz = ZoneInfo(os.getenv("CAL_TIMEZONE", os.getenv("TZ", "Asia/Shanghai")))
        except Exception:
            tz = ZoneInfo("Asia/Shanghai")
        schedule_md = format_events_markdown(events, tz)
        print("🗓️  已获取日历事件：")
        print(schedule_md)
    else:
        print("🗓️  未启用或未获取日历事件")

    # 1) 获取任务（过滤“日记”项目）
    print("📁 正在获取任务数据...")
    tasks, projects = fetch_all_tasks_filtered(dida_token, exclude_project)
    if not tasks:
        print("❌ 没有可用任务，流程结束")
        sys.exit(1)

    # 2) 生成任务报告（简洁层级列表），供AI使用
    print("📝 正在生成任务列表...（供AI参考）")
    tasks_markdown = qft.format_tasks_for_ai(tasks, projects)

    # 3) 调用大模型生成当日计划（把“今日行程”放在用户提示词最顶部）
    print("🤖 正在调用大模型生成当日计划...")
    messages = build_ai_messages(tasks_markdown, schedule_md)
    ai_plan = call_llm(llm_api_key, model, messages)
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