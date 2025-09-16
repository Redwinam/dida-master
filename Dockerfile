# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 安装时区与证书
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Shanghai

WORKDIR /app

# 仅复制需求文件以便缓存
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 安装 supercronic（用于容器内 cron）
ENV SUPERCRONIC_URL="https://github.com/aptible/supercronic/releases/download/v0.2.34/supercronic-linux-amd64" \
    SUPERCRONIC_SHA1SUM="e8631edc1775000d119b70fd40339a7238eece14" \
    SUPERCRONIC="supercronic-linux-amd64"
RUN curl -fsSLO "$SUPERCRONIC_URL" \
    && echo "${SUPERCRONIC_SHA1SUM} ${SUPERCRONIC}" | sha1sum -c - \
    && chmod +x "$SUPERCRONIC" \
    && mv "$SUPERCRONIC" "/usr/local/bin/${SUPERCRONIC}" \
    && ln -s "/usr/local/bin/${SUPERCRONIC}" /usr/local/bin/supercronic

# 写入每日 05:30 触发的 crontab（使用容器本地时区 TZ）
# 直接让 supercronic 捕获脚本的 stdout/stderr（无需重定向）
RUN echo '30 5 * * * /usr/local/bin/python3 -u /app/ai_daily_note.py' > /crontab

# 入口：启动 supercronic 管理定时任务
CMD ["supercronic", "-json", "/crontab"]