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
# Web 前端默认绑定与模式（在 Dokploy 中建议使用 web 模式）
ENV HOST=0.0.0.0 \
    PORT=5000 \
    FLASK_DEBUG=0 \
    APP_MODE=web

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

# 暴露 Web 端口，便于平台识别
EXPOSE 5000

# 入口脚本：根据 APP_MODE 决定运行 Web 或 Cron
COPY entry.sh /entry.sh
RUN chmod +x /entry.sh

CMD ["/bin/sh", "/entry.sh"]