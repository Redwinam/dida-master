# 滴答清单助手 (Dida Task Master)

这是一个基于 Nuxt 4 + Supabase 的个人时间管理助手应用。它旨在帮助 INTJ 等注重效率的人群更好地管理时间和任务。

## 🌟 核心功能

1.  **每日 AI 日程生成**
    *   从滴答清单 (TickTick/Dida) 获取今日待办任务。
    *   从 iCloud 日历获取今日已有行程。
    *   调用大模型 (DeepSeek/OpenAI) 结合任务与行程，生成一份专业的每日日程安排建议。
    *   自动将生成的日程建议作为一条“每日笔记”写入滴答清单。

2.  **图片转日历 (Image to Calendar)**
    *   上传一张包含日程信息的图片（如海报、截图）。
    *   利用多模态大模型 (Qwen-VL 等) 智能识别图片中的事件信息（标题、时间、地点）。
    *   自动将识别出的事件添加到您的 iCloud 日历中。

3.  **个性化配置**
    *   支持多用户使用 (基于 Supabase Auth)。
    *   每个用户可独立配置自己的 API Token、大模型 Key、日历账号等。
    *   配置信息加密存储于 Supabase 数据库。

## 🛠️ 技术栈

*   **框架**: [Nuxt 4](https://nuxt.com) (Vue 3)
*   **后端/数据库**: [Supabase](https://supabase.com) (PostgreSQL, Auth)
*   **UI 组件库**: [Nuxt UI](https://ui.nuxt.com) (Tailwind CSS)
*   **AI 集成**: OpenAI SDK (兼容 DeepSeek, SiliconFlow 等)
*   **日历集成**: `tsdav`, `ical.js` (CalDAV 协议)

## 🚀 快速开始

### 1. 环境准备

确保您已安装 Node.js (v18+) 和 npm/pnpm。

### 2. Supabase 设置

1.  创建一个 Supabase 项目。
2.  在 SQL Editor 中执行以下 SQL 语句以初始化数据库表：

```sql
create table public.dida_master_user_config (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  dida_token text,
  dida_project_id text,
  exclude_project_name text,
  llm_api_key text,
  llm_model text,
  llm_api_url text,
  cal_enable boolean default false,
  icloud_username text,
  icloud_app_password text,
  cal_lookahead_days integer default 2,
  calendar_target text,
  updated_at timestamptz default now()
);

alter table public.dida_master_user_config enable row level security;

create policy "Users can view their own config" on public.dida_master_user_config for select using (auth.uid() = user_id);
create policy "Users can insert their own config" on public.dida_master_user_config for insert with check (auth.uid() = user_id);
create policy "Users can update their own config" on public.dida_master_user_config for update using (auth.uid() = user_id);
```

### 3. 环境变量配置

复制 `.env` 文件并填入您的 Supabase 项目信息：

```bash
NUXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NUXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

*(注意：旧版 `.env` 中的其他变量现已迁移至数据库配置，应用启动后可在网页端填写)*

### 4. 启动开发服务器

```bash
# 安装依赖
npm install

# 启动服务
npm run dev
```

访问 `http://localhost:3000`。

## 📝 使用指南

1.  **注册/登录**: 使用邮箱注册一个账户。
2.  **填写配置**:
    *   在首页“配置”标签页中，填入您的滴答清单 Token、LLM API Key 等信息。
    *   **滴答清单 Token**: 需要您自行申请或抓包获取。
    *   **iCloud 密码**: 请使用 Apple ID 的“应用专用密码”。
3.  **生成日报**: 点击“功能” -> “每日笔记生成” -> “立即生成”。
4.  **图片日程**: 点击“功能” -> “图片转日历” -> 上传图片 -> “识别并添加”。

## ⚠️ 注意事项

*   **Privacy**: 您的所有 Token 和密码仅存储在您自己的 Supabase 数据库行中，且受 RLS (Row Level Security) 保护，仅您自己可见。
*   **Token**: 请妥善保管您的 API Key 和 Token。

## 🤝 贡献

欢迎提交 Issue 和 PR 改进本项目。
