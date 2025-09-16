# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 安装时区与证书
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Shanghai

WORKDIR /app

# 仅复制需求文件以便缓存
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 入口脚本：运行一次全流程
CMD ["python", "ai_daily_note.py"]