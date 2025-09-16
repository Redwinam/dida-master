# 滴答清单任务获取脚本

这是一个用于获取滴答清单（Dida365）所有任务的 Python 脚本，可以将任务数据格式化后供 AI 整理每日清单使用。

## 功能特性

- 🔐 OAuth 2.0 认证流程
- 📋 获取所有任务数据
- 📁 获取项目/清单信息
- 📝 格式化输出供 AI 使用
- 💾 自动保存到 Markdown 文件
- 📊 任务统计分析

## 安装依赖

1. 创建虚拟环境：

```bash
python3 -m venv venv
```

2. 激活虚拟环境：

```bash
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate     # Windows
```

3. 安装依赖：

```bash
pip install -r requirements.txt
```

## 使用方法

### 1. 获取 API 凭证

1. 访问 [滴答清单开发者管理页面](https://developer.dida365.com/manage)
2. 创建新应用程序
3. 获取 `Client ID` 和 `Client Secret`
4. 设置回调 URL 为：`http://localhost:8080/callback`

### 2. 运行脚本

```bash
source venv/bin/activate
python3 dida_task_fetcher.py
```

### 3. 授权流程

1. 脚本会自动打开浏览器进行授权
2. 在滴答清单授权页面点击"允许"
3. 从回调 URL 中复制 `code` 参数
4. 将授权码粘贴到脚本提示处

### 4. 获取任务数据

脚本会自动：

- 获取访问令牌
- 获取所有项目信息
- 获取所有任务数据
- 格式化并保存到 Markdown 文件

## 输出格式

生成的 Markdown 文件包含：

- 📊 任务统计信息
- 📋 未完成任务详情（包括标题、项目、优先级、截止日期、描述）
- ✅ 已完成任务统计
- 🕒 生成时间戳

## 配置说明

在 `dida_task_fetcher.py` 中修改以下配置：

```python
CLIENT_ID = "你的Client ID"
CLIENT_SECRET = "你的Client Secret"
```

## API 权限说明

脚本需要以下 API 权限：

- `tasks:read` - 读取任务
- `tasks:write` - 写入任务（用于测试）

## 故障排除

### 常见问题

1. **授权失败**

   - 检查 Client ID 和 Client Secret 是否正确
   - 确认回调 URL 设置正确
   - 检查网络连接

2. **获取任务失败**

   - 确认访问令牌有效
   - 检查 API 权限设置
   - 查看错误日志

3. **依赖安装失败**
   - 使用虚拟环境
   - 更新 pip 版本
   - 检查 Python 版本（推荐 3.8+）

### 调试模式

脚本会输出详细的调试信息，包括：

- HTTP 请求状态码
- 响应内容
- 错误详情

## 文件说明

- `dida_task_fetcher.py` - 主脚本文件
- `requirements.txt` - Python 依赖列表
- `README.md` - 使用说明文档
- `dida_tasks_*.md` - 生成的任务报告文件

## 注意事项

⚠️ **重要提醒**：

- 请妥善保管 API 凭证，不要泄露给他人
- 访问令牌有时效性，过期后需重新授权
- 建议定期备份任务数据
- 脚本仅用于个人数据获取，请遵守滴答清单服务条款

## 许可证

本项目仅供学习和个人使用。

## 参考资料

- [滴答清单开发者文档](https://developer.dida365.com/docs#/openapi)
- [OAuth 2.0 规范](https://tools.ietf.org/html/rfc6749)
- [参考项目](https://github.com/Stream-L/dida-auth)
