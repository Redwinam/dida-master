# AI Gateway Function

这是一个通用的 AI 网关 Supabase Edge Function，用于统一管理和调用不同的 LLM 服务（如 OpenAI, Gemini 等）。

## 功能特点

- **多模型支持**: 支持通过配置切换不同的 LLM 提供商和模型。
- **多模态支持**: 支持文本 (`text`) 和图片 (`image`) 输入。
- **统一接口**: 为客户端提供统一的调用方式，无需在客户端暴露 API Key。
- **服务隔离**: 通过 `service_key` (如 `DIDA_DAILY_NOTE`) 区分不同的业务场景，每个场景可以配置独立的系统提示词 (System Prompt) 和模型参数。
- **用户级配置**: 支持用户自定义自己的 API Key 和模型偏好 (通过 `ai_model_mappings` 和 `llm_configs` 表)。
12→  - **全局默认回退**: 用户只需在配置界面设置一次“默认文本模型”和“默认图片模型”，网关将自动关联 `DEFAULT_TEXT` 和 `DEFAULT_IMAGE` 映射。所有未单独配置模型的业务场景（service_key）都会自动回退到这两个全局默认模型。
13→- **安全鉴权**: 
14→  - 支持 Supabase Auth (Bearer Token)。
15→  - 自动识别用户身份，应用用户特定的配置。
16→  - 支持 Service Role Key 调用（系统级任务）。
17→- **智能 URL 构建**: 针对 DeepSeek 等 OpenAI 兼容接口，网关会自动处理 `base_url` 的路径拼接（自动补全 `/chat/completions`），降低配置心智负担。

## 部署说明

### 1. 前置条件

确保你的 Supabase 项目中已经包含了以下数据库表：
- `ai_service_keys`: 存储业务场景定义 (service_key, default_model, system_prompt 等)。
- `llm_configs`: 存储 LLM 配置 (api_url, api_key, models 等)。
- `ai_model_mappings`: 存储用户对特定 service_key 的个性化配置映射。

### 2. 环境变量

确保 Edge Function 的环境变量中设置了以下值 (通常 Supabase 自动注入):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. 部署命令

在 `if9-supabase-functions` 目录下运行：

```bash
# 登录 Supabase (如果未登录)
supabase login

# 部署函数
supabase functions deploy ai-gateway --project-ref <your-project-ref> --no-verify-jwt
```

**注意**: `--no-verify-jwt` 是可选的。如果开启 JWT 验证（默认），客户端请求必须带上有效的 Authorization header。本网关代码内部也进行了 Authorization header 的检查和用户解析，因此建议保持默认开启 JWT 验证以增加安全性，或者在代码中严格处理。当前代码逻辑支持接收 Authorization header 并用于创建 Supabase Client。

## API 使用文档

### 接口地址
`POST https://<project-ref>.supabase.co/functions/v1/ai-gateway`

### 请求头
```
Content-Type: application/json
Authorization: Bearer <user_access_token_or_service_key>
```

### 请求体 (JSON)

#### 1. 文本生成

```json
{
  "service_key": "DIDA_DAILY_NOTE",
  "input": {
    "type": "text",
    "prompt": "今天我有很多事情要做..."
  }
}
```

#### 2. 图片分析

```json
{
  "service_key": "DIDA_IMAGE_TO_CALENDAR",
  "input": {
    "type": "image",
    "prompt": "识别图中的日程",
    "image_base64": "..." // 或者使用 "image_url": "https://..."
  }
}
```

### Service Role 调用 (系统级/后台任务)

如果你是在后台脚本或服务中调用网关，通常使用 Service Role Key。此时，为了让网关应用特定用户的配置，你需要显式传递 `user_id`。

**请求头**:
```
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

**请求体**:
```json
{
  "service_key": "DIDA_DAILY_NOTE",
  "user_id": "157c30f5-15c9-40d3-92f5-c369eb9ab49d", // 指定目标用户 ID
  "input": {
    "type": "text",
    "prompt": "..."
  }
}
```

如果不传递 `user_id`，网关将无法找到用户的个性化映射，从而回退到系统默认配置（可能导致使用错误的全局默认模型）。

### 响应

返回 LLM 的生成内容 (纯文本或 JSON 字符串，取决于 Prompt 要求)。

## 本地开发

```bash
deno task start
```
