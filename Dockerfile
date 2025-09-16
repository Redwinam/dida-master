# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 安装时区与证书
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Shanghai
# 允许通过环境变量配置 cron 表达式，默认每天 05:30
ENV CRON_SCHEDULE="30 5 * * *"
# 允许配置是否在启动时先执行一次脚本（默认 true）
ENV RUN_ON_START="true"

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

# 启动时：
# 1) 根据 CRON_SCHEDULE 生成 /crontab（运行时读取平台注入的环境变量）
# 2) 打印 /crontab 并做语法校验，便于排查
# 3) 若 RUN_ON_START=true 则先执行一次脚本
# 4) 再以 supercronic 常驻（debug + json），按计划执行
CMD ["sh", "-c", "echo \"$CRON_SCHEDULE /bin/sh -c '/usr/local/bin/python3 -u /app/ai_daily_note.py'\" > /crontab; echo '--- /crontab ---'; cat /crontab; supercronic -test /crontab || true; if [ \"${RUN_ON_START:-true}\" = \"true\" ]; then /usr/local/bin/python3 -u /app/ai_daily_note.py || true; fi; exec /usr/local/bin/supercronic -debug -json /crontab"]