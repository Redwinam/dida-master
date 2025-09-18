# 每日 AI 日程 + 滴答清单笔记服务

基于 Python 与 Docker 的自动化服务：

- 从滴答清单（Dida365）拉取任务，调用大模型生成当日日程与建议
- 将结果作为“笔记（NOTE）”创建到指定项目
- 支持容器内定时（supercronic）与“启动时先执行一次”
- 可选集成 iCloud CalDAV，把“今日行程”注入到提示词最前面，辅助更合理的计划

## 目录结构

- ai_daily_note.py：主流程（任务 →LLM→ 创建笔记），支持 CalDAV
- quick_fetch_tasks.py：滴答任务/项目获取与格式化
- dida_task_fetcher.py：OAuth 调试脚本（可忽略）
- Dockerfile：容器与调度
- requirements.txt：依赖

## 运行前准备（必需环境变量）

- DIDA_TOKEN：滴答清单访问令牌
- DIDA_PROJECT_ID：用于创建“每日笔记”的项目 ID
- LLM_API_KEY：大模型 API Key（默认使用 SiliconFlow 兼容 OpenAI 接口）

可选环境变量：

- EXCLUDE_PROJECT_NAME：过滤的项目名（默认：日记）
- LLM_MODEL：默认 deepseek-ai/DeepSeek-V3.1
- LLM_API_URL：默认 https://api.siliconflow.cn/v1/chat/completions

CalDAV（iCloud）相关（可选）：

- CAL_ENABLE=true 开启日历注入
- CAL_PROVIDER=icloud（固定）
- ICLOUD_USERNAME、ICLOUD_APP_PASSWORD（应用专用密码）
- CALENDAR_NAME（留空=全部）
- CAL_TIMEZONE（默认沿用 TZ 或 Asia/Shanghai）
- CAL_LOOKAHEAD_DAYS=0 仅今天（可设 1/2 看未来几天）
- CAL_MAX_EVENTS=50 最多注入事件条数

## 本地运行（一次性执行）

```bash
pip install -r requirements.txt
export DIDA_TOKEN=... DIDA_PROJECT_ID=... LLM_API_KEY=...
# 可选：开启日历
export CAL_ENABLE=true CAL_PROVIDER=icloud ICLOUD_USERNAME=... ICLOUD_APP_PASSWORD=...
python3 ai_daily_note.py
```

执行完成后，会在滴答清单目标项目创建一条“当日笔记”，并在仓库根目录生成备份 md 文件。

## Docker 部署与定时

镜像内置 supercronic 定时与诊断：

- CRON_SCHEDULE：定时表达式（默认 30 5 \* \* \*，每天 05:30）
- RUN_ON_START：true/false，是否在容器启动时先执行一次（默认 true）

示例：

```bash
docker build -t dida-master .
# 每 2 分钟执行一次（便于观察日志），并在启动时先执行一次
docker run --rm -e DIDA_TOKEN=... -e DIDA_PROJECT_ID=... -e LLM_API_KEY=... \
  -e CRON_SCHEDULE="*/2 * * * *" -e RUN_ON_START=true \
  -e CAL_ENABLE=true -e CAL_PROVIDER=icloud -e ICLOUD_USERNAME=... -e ICLOUD_APP_PASSWORD=... \
  dida-master
```

容器启动时会：

1. 基于 CRON_SCHEDULE 生成 /crontab
2. 打印/校验 crontab（supercronic -test）
3. 若 RUN_ON_START=true 先执行一次 ai_daily_note.py
4. 常驻执行 supercronic（-debug -json，方便排查）

提示：日志中的“reaping dead processes”是 supercronic 正常回收信息；“try parse ... failed to parse ...”是 cron 兼容性探测日志，最终会以识别成功的表达式生效。

## Dokploy 部署指引

- 在 Environment Settings 填写运行时变量（见“运行前准备”与“CalDAV”），无需 Build-time 变量
- 可先将 CRON*SCHEDULE 设为 "*/2 \_ \* \* \*" 验证，确认稳定后改回默认
- 若不希望启动即执行，设置 RUN_ON_START=false

## 故障排除

- CalDAV 读取失败：检查应用专用密码、网络到 https://caldav.icloud.com/ 、环境变量是否正确；日志不会打印敏感信息
- 依赖问题：容器会按 requirements.txt 安装 caldav/vobject
- 没创建笔记：检查 DIDA_TOKEN、DIDA_PROJECT_ID、LLM_API_KEY 与 API 返回码

## 安全

- 所有密钥/口令仅通过运行时环境变量配置，不提交到仓库，不在日志中打印

## 许可

CC BY-NC-SA 4.0
