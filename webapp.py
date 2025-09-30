#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import json
import glob
import shlex
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from flask import Flask, request, redirect, url_for, Response
import markdown2
import html as htmlmod

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"

app = Flask(__name__)


DEFAULT_KEYS = [
    # 滴答清单 & LLM
    "DIDA_TOKEN",
    "DIDA_PROJECT_ID",
    "EXCLUDE_PROJECT_NAME",
    "LLM_API_KEY",
    "LLM_MODEL",
    "LLM_API_URL",
    # 日历
    "CAL_ENABLE",
    "CAL_PROVIDER",
    "ICLOUD_USERNAME",
    "ICLOUD_APP_PASSWORD",
    "CALENDAR_NAME",
    "CAL_LOOKAHEAD_DAYS",
    "CAL_MAX_EVENTS",
    "CAL_TIMEZONE",
    # 其他
    "TZ",
]


def load_config() -> Dict[str, str]:
    if CONFIG_PATH.exists():
        try:
            with CONFIG_PATH.open("r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return {k: str(v) for k, v in data.items()}
        except Exception:
            pass
    return {}


def save_config(data: Dict[str, str]) -> None:
    CONFIG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def get_effective_env() -> Dict[str, str]:
    env = dict(os.environ)
    cfg = load_config()
    env.update({k: v for k, v in cfg.items() if v is not None})
    # 兼容 EXCLUDE_PROJECT_NAME 多格式输入：
    # - 已是严格格式："A","B" -> 原样保留
    # - 宽松格式：A,B 或 A，B 或以空格分隔 -> 规范化为严格格式
    try:
        v = env.get("EXCLUDE_PROJECT_NAME", "")
        if v:
            strict = r'^\s*"[^"]*"(?:\s*,\s*"[^"]*")*\s*$'
            if not re.match(strict, v):
                parts = re.split(r'[\s,，]+', v)
                cleaned = []
                for p in parts:
                    p = p.strip()
                    if not p:
                        continue
                    # 将内部双引号转义为两个双引号
                    p = p.replace('"', '""')
                    cleaned.append(f'"{p}"')
                env["EXCLUDE_PROJECT_NAME"] = ",".join(cleaned)
    except Exception:
        pass
    # 默认值
    env.setdefault("LLM_API_URL", "https://api.siliconflow.cn/v1/chat/completions")
    env.setdefault("LLM_MODEL", "deepseek-ai/DeepSeek-V3.1")
    env.setdefault("TZ", "Asia/Shanghai")
    return env


def run_script(module_file: str) -> str:
    """以子进程运行指定脚本文件，返回合并日志文本。"""
    import subprocess

    env = get_effective_env()
    cmd = [sys.executable, str(BASE_DIR / module_file)]
    proc = subprocess.run(
        cmd,
        cwd=str(BASE_DIR),
        env=env,
        capture_output=True,
        text=True,
    )
    output = (proc.stdout or "") + (proc.stderr or "")
    header = f"$ {' '.join(shlex.quote(c) for c in cmd)}\n退出码: {proc.returncode}\n\n"
    return header + output


def list_markdown_files() -> List[Path]:
    patterns = [
        "ai_daily_plan_*.md",
        "dida_tasks*.md",
        "dida_tasks_new_format_*.md",
        "*.md",
    ]
    seen = set()
    files: List[Path] = []
    for p in patterns:
        for f in BASE_DIR.glob(p):
            if f.is_file() and f.suffix.lower() == ".md":
                if f not in seen:
                    seen.add(f)
                    files.append(f)
    # 去重后按修改时间倒序
    files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    return files


def render_page(title: str, body_html: str) -> str:
    html = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>%%TITLE%%</title>
  <link rel="stylesheet" href="/static/style.css">
  <script>
    function post(url, formId) {
      const form = document.getElementById(formId);
      const data = new FormData(form);
      fetch(url, {method: 'POST', body: data})
        .then(r => r.text())
        .then(t => { document.getElementById('output').innerHTML = '<pre>' + t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre>'; });
      return false;
    }
    function del(file) {
      if(!confirm('确认删除: ' + file + ' ?')) return;
      fetch('/notes/delete', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: 'file=' + encodeURIComponent(file)})
        .then(()=>location.reload());
    }
    function cleanup(mode) {
      if(!confirm(mode==='all' ? '确认清理全部 .md（README.md 除外）？' : '确认清理备份与任务导出 .md ？')) return;
      fetch('/notes/cleanup', {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: 'mode=' + encodeURIComponent(mode)})
        .then(()=>location.reload());
    }
  </script>
</head>
<body>
  <header>
    <h2>%%TITLE%%</h2>
    <nav>
      <a href="/">首页</a>
      <a href="/config">配置</a>
      <a href="/notes">日程MD</a>
    </nav>
  </header>
  <div class="container">%%BODY%%</div>
</body>
</html>
"""
    return html.replace("%%TITLE%%", title).replace("%%BODY%%", body_html)


@app.get("/")
def index():
    body = """
    <div class="grid">
      <div class="card">
        <h3>🚀 手动触发</h3>
        <p class="muted">生成当日日程并写入滴答清单，或仅拉取任务。</p>
        <form id=aiForm onsubmit="return post('/trigger/ai-note','aiForm')">
          <button class="btn" type=submit>生成当日日程并创建滴答笔记</button>
        </form>
        <div style="height:8px"></div>
        <form id=fetchForm onsubmit="return post('/trigger/fetch-tasks','fetchForm')">
          <button class="btn gray" type=submit>快速拉取滴答任务（仅展示）</button>
        </form>
      </div>
      <div class="card">
        <h3>🧹 一键清理</h3>
        <p class="muted">支持清理备份与任务导出，或清理全部 .md（保留 README.md）。</p>
        <button class="btn outline" onclick="cleanup('generated')">清理备份与导出 .md</button>
        <div style="height:8px"></div>
        <button class="btn red" onclick="cleanup('all')">清理全部 .md（除 README.md）</button>
      </div>
    </div>
    <div id=output class="card"><em>执行输出将在这里显示</em></div>
    """
    return render_page("自动化工具面板", body)


@app.post("/trigger/ai-note")
def trigger_ai_note():
    log = run_script("ai_daily_note.py")
    return Response(log, mimetype="text/plain; charset=utf-8")


@app.post("/trigger/fetch-tasks")
def trigger_fetch_tasks():
    # 直接运行 quick_fetch_tasks.py，结果打印到输出
    log = run_script("quick_fetch_tasks.py")
    return Response(log, mimetype="text/plain; charset=utf-8")


@app.get("/config")
def config_page():
    env = get_effective_env()
    cfg = load_config()
    inputs = []
    for key in DEFAULT_KEYS:
        val = cfg.get(key, env.get(key, ""))
        safe_val = htmlmod.escape(val, quote=True)
        t = "password" if "KEY" in key or "PASSWORD" in key or key.endswith("TOKEN") else "text"
        if key == "EXCLUDE_PROJECT_NAME":
            inputs.append(
                f"<label>{key}</label><input name=\"{key}\" type=\"{t}\" value=\"{safe_val}\" placeholder='例如：\"日记\",\"杂役\"'>"
            )
        else:
            inputs.append(f"<label>{key}</label><input name=\"{key}\" type=\"{t}\" value=\"{safe_val}\">")
    body = """
    <form class=card method=post action=/config>
      <h3>配置管理（保存到 config.json，优先于环境变量）</h3>
      {inputs}
      <button class=btn type=submit>保存配置</button>
    </form>
    """.replace("{inputs}", "\n".join(inputs))
    return render_page("配置管理", body)


@app.post("/config")
def config_save():
    data = load_config()
    for key in DEFAULT_KEYS:
        if key in request.form:
            data[key] = request.form.get(key, "")
    save_config(data)
    return redirect(url_for("config_page"))


@app.get("/notes")
def notes_page():
    files = list_markdown_files()
    rows = []
    for f in files:
        stat = f.stat()
        size_k = f"{stat.st_size/1024:.1f} KB"
        mtime = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        is_readme = f.name.lower() == 'readme.md'
        ops = [f"<a class=btn outline href=\"/notes/view?file={f.name}\">预览</a>"]
        if not is_readme:
            ops.append(f"<a class=btn red href=javascript:del('{f.name}')>删除</a>")
        else:
            ops.append(f"<span class=muted>（保护文件）</span>")
        rows.append(
            f"<tr><td>{f.name}</td><td>{size_k}</td><td>{mtime}</td><td>{' '.join(ops)}</td></tr>"
        )
    table = """
    <div class="card">
      <h3>本地日程 Markdown</h3>
      <table>
        <thead><tr><th>文件名</th><th>大小</th><th>修改时间</th><th>操作</th></tr></thead>
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
    """.replace("{rows}", "\n".join(rows) or "<tr><td colspan=4><em>暂无 .md 文件</em></td></tr>")
    return render_page("日程 Markdown", table)


@app.post("/notes/delete")
def notes_delete():
    name = request.form.get("file", "")
    # 安全限制：仅允许删除当前目录下的 .md 文件，不可越权
    if not name.endswith(".md"):
        return ("只允许删除 .md 文件", 400)
    if name.lower() == 'readme.md':
        return ("README.md 为保护文件，不能删除", 400)
    target = BASE_DIR / name
    if not target.exists() or not target.is_file():
        return ("文件不存在", 404)
    try:
        target.unlink()
    except Exception as e:
        return (f"删除失败: {e}", 500)
    return ("OK", 200)


@app.post("/notes/cleanup")
def notes_cleanup():
    mode = request.form.get("mode", "generated").strip()
    deleted = 0
    errors: List[str] = []
    try:
        if mode == 'all':
            for f in BASE_DIR.glob("*.md"):
                if f.name.lower() == 'readme.md':
                    continue
                try:
                    f.unlink()
                    deleted += 1
                except Exception as e:
                    errors.append(f"{f.name}: {e}")
        else:  # generated
            pats = ["ai_daily_plan_*.md", "dida_tasks*.md", "dida_tasks_new_format_*.md"]
            for p in pats:
                for f in BASE_DIR.glob(p):
                    if not f.is_file():
                        continue
                    try:
                        f.unlink()
                        deleted += 1
                    except Exception as e:
                        errors.append(f"{f.name}: {e}")
    except Exception as e:
        return (f"清理失败: {e}", 500)

    msg = f"OK, 清理 {deleted} 个文件" + ("; 错误: " + ", ".join(errors) if errors else "")
    return (msg, 200)


@app.get("/notes/view")
def notes_view():
    name = request.args.get("file", "")
    if not name.endswith(".md"):
        return ("只支持预览 .md 文件", 400)
    target = BASE_DIR / name
    if not target.exists() or not target.is_file():
        return ("文件不存在", 404)
    try:
        text = target.read_text(encoding="utf-8")
    except Exception as e:
        return (f"读取失败: {e}", 500)

    # 使用 markdown2 渲染基本 Markdown
    try:
        md_html = markdown2.markdown(text, extras=[
            'fenced-code-blocks', 'tables', 'strike', 'task_list'
        ])
    except Exception:
        md_html = '<pre>' + text.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;') + '</pre>'

    body = f"""
    <div class="card">
      <h3>预览：{name}</h3>
      <div style="line-height:1.7">{md_html}</div>
      <div style="margin-top:12px"><a class="btn" href="/notes">返回列表</a></div>
    </div>
    """
    return render_page("Markdown 预览", body)


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "5000"))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host=host, port=port, debug=debug)