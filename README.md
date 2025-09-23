# 每日 AI 日程 + 滴答清单笔记服务

这个小工具会做三件事：
- 从滴答清单（Dida365）读取你今天要做的任务（可排除指定项目）
- 调用大模型，根据任务和（可选的）日历事件，生成一份当天的行动建议
- 把结果作为一条“笔记（NOTE）”写回你指定的滴答清单项目中，并在本地保存一份 md 备份

可选：读取 iCloud 日历（CalDAV），把“今天及未来几天的行程”放在提示词最前面，帮助模型更合理地规划。

## 目录结构
- ai_daily_note.py：主流程（任务 → LLM → 创建笔记），支持 iCloud CalDAV
- quick_fetch_tasks.py：滴答清单任务/项目获取与格式化
- dida_task_fetcher.py：OAuth 调试脚本（可忽略）
- Dockerfile、docker-compose.yml：容器与定时运行
- requirements.txt：依赖

## 快速开始（本地一次性运行）
```bash
pip install -r requirements.txt
export DIDA_TOKEN=... DIDA_PROJECT_ID=... LLM_API_KEY=...
# 如需注入日历：
export CAL_ENABLE=true CAL_PROVIDER=icloud ICLOUD_USERNAME=你的邮箱 ICLOUD_APP_PASSWORD=你的应用专用密码
python3 ai_daily_note.py
```
执行完毕后：
- 会在滴答清单“目标项目”里新增一条当天笔记（标题为中文日期）
- 在仓库目录生成一份备份文件：ai_daily_plan_YYYYMMDD_HHMMSS.md

## 必需环境变量
- DIDA_TOKEN：滴答清单访问令牌
- DIDA_PROJECT_ID：用来保存“每日笔记”的项目 ID
- LLM_API_KEY：大模型 API Key（默认对接 SiliconFlow 的 OpenAI 兼容接口）

## 可选环境变量（通用）
- EXCLUDE_PROJECT_NAME：需要排除的项目名（支持多个，严格格式如下）
- LLM_MODEL：默认 deepseek-ai/DeepSeek-V3.1
- LLM_API_URL：默认 https://api.siliconflow.cn/v1/chat/completions

### EXCLUDE_PROJECT_NAME 的严格格式（重要）
为避免项目名中包含标点导致误分割，这里采用“英文逗号分隔 + 每个项目名用双引号包裹”的严格格式：
- 正确示例：
  - export EXCLUDE_PROJECT_NAME='"日记","杂物"'
  - 项目名里包含英文逗号：export EXCLUDE_PROJECT_NAME='"昨天,今天,明天","杂物"'
  - 项目名里有双引号：把内部双引号写成两个双引号，例如：
    export EXCLUDE_PROJECT_NAME='"有""引号""的项目","另一个"'
- 允许空值（不排除任何项目）
- 若格式不正确，程序会提示错误并退出（便于及早发现问题）

## 可选环境变量（iCloud 日历注入）
- CAL_ENABLE：true 开启；默认不开启
- CAL_PROVIDER：icloud（固定）
- ICLOUD_USERNAME、ICLOUD_APP_PASSWORD：iCloud 邮箱与“应用专用密码”
- CALENDAR_NAME：仅读取某个日历（留空=全部）
- CAL_TIMEZONE：默认 Asia/Shanghai（会同时作为解析与展示时区）
- CAL_LOOKAHEAD_DAYS：向后查看的天数，0 表示仅今天（例如 3 表示今天 + 接下来 3 天）
- CAL_MAX_EVENTS：最多注入的事件条数，默认 50

日历注入的显示规则：
- 会按天分组展示，例如“2025年9月23日行程：”
- 某天没有事件，会明确输出一行“ - 无”
- 有助于模型区分不同日期的安排，避免跨天事件混淆

## Docker 运行（内置定时）
镜像中集成了 supercronic：
- CRON_SCHEDULE：定时表达式（默认 30 5 * * *，每天 05:30）
- RUN_ON_START：true/false，容器启动时是否先执行一次（默认 true）

示例：
```bash
docker build -t dida-master .
# 每 2 分钟执行一次，且启动时先执行一次
docker run --rm \
  -e DIDA_TOKEN=... -e DIDA_PROJECT_ID=... -e LLM_API_KEY=... \
  -e CRON_SCHEDULE="*/2 * * * *" -e RUN_ON_START=true \
  -e CAL_ENABLE=true -e CAL_PROVIDER=icloud -e ICLOUD_USERNAME=... -e ICLOUD_APP_PASSWORD=... \
  dida-master
```
容器会：
1) 生成并校验 crontab；2) 若 RUN_ON_START=true 先执行一次；3) 常驻 supercronic 输出可读日志（便于排查）。

## 常见问题
- CalDAV 读取失败：检查应用专用密码、网络到 https://caldav.icloud.com/、以及环境变量是否正确。
- 没创建笔记：检查 DIDA_TOKEN、DIDA_PROJECT_ID、LLM_API_KEY，查看控制台返回码与日志。
- 依赖异常：按 requirements.txt 安装。容器镜像会自动安装 caldav/vobject。

## 安全
- 所有密钥/口令仅通过环境变量配置，不写入代码库，也不会在日志打印明文。

## 许可
CC BY-NC-SA 4.0
