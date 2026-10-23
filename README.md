# Hete3ks 博客升级包（GitHub Pages + Supabase）

本升级包基于仓库 `https://github.com/yi1191388237/hete3ks-blog` 的现有结构设计，沿用原有 `posts` 表，并新增 Markdown 编辑器、评论审核、归档、文章目录与密码重置页。

## 文件清单

- `index.html`, `style.css`, `app.js`：简约杂志风博客前台
- `admin.html`, `admin.css`, `admin.js`：管理员登录、文章 CRUD、Markdown 编辑/预览、评论审核
- `reset-password.html`, `reset-password.js`：Supabase 密码重置回调页面
- `config.js`：Supabase URL 和浏览器端 anon/publishable 公钥
- `schema.sql`：增量数据库迁移、评论表和 RLS 策略

## 部署前必须完成

### 1. 配置 Supabase 公钥

编辑根目录 `config.js`，保留现有项目 URL，并将 `SUPABASE_ANON_KEY` 替换为 Supabase Dashboard 的 anon/publishable 公钥。不要使用 `service_role` 或 secret key。

### 2. 执行 SQL 迁移

在 Supabase Dashboard → SQL Editor 中运行 `schema.sql` 全文。该脚本为增量迁移，使用 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`，不会删除现有文章。运行前仍建议从 Supabase Dashboard 导出一次数据库备份。

### 3. 管理员配置

- Authentication → Users 中保留你已有的管理员用户。
- 确认该用户的 **app_metadata** 为 `{"role":"admin"}`（不是 user_metadata）。
- Authentication 设置中关闭公开注册。
- 若更改了 app_metadata，请退出后台后重新登录，确保新的 JWT 生效。

### 4. Supabase Auth URL 设置

在 Authentication → URL Configuration 中设置：

- Site URL：`https://yi1191388237.github.io/hete3ks-blog/`
- Redirect URLs：`https://yi1191388237.github.io/hete3ks-blog/reset-password.html`
- 本地调试可另加：`http://localhost:8000/reset-password.html`

如你的 GitHub Pages 实际地址不同，以仓库 Settings → Pages 显示的 URL 为准。

### 5. 上传到 GitHub

建议先在本地下载当前仓库或创建备份分支，然后把升级包中的同名文件覆盖到仓库根目录，并新增 `reset-password.html`、`reset-password.js`。不要把整个 zip 文件本身上传代替解压后的文件。

仓库根目录应包含：
```
index.html
style.css
app.js
config.js
admin.html
admin.css
admin.js
reset-password.html
reset-password.js
schema.sql
README.md
```

提交到 `main` 后，GitHub Pages 会重新部署。后台地址：
`https://yi1191388237.github.io/hete3ks-blog/admin.html`

## 本地测试（Windows）

在解压目录地址栏输入 `cmd`，执行：
```powershell
python -m http.server 8000
```
打开：
- 前台：`http://localhost:8000/`
- 后台：`http://localhost:8000/admin.html`
- 密码重置：`http://localhost:8000/reset-password.html`

## 功能说明

- 文章正文采用 Markdown；前台通过 `marked` 渲染并使用 DOMPurify 清理 HTML。
- 公开首页只读取已发布且 `published_at <= now()` 的文章。
- 评论提交时强制 `status='pending'`；访客只能读取已批准评论，不能更新或删除评论。
- 管理后台通过 `is_blog_admin()` 检查管理员 JWT，文章写入与评论审核还会受到数据库 RLS 的二次约束。
- 管理员忘记密码邮件将跳转到 `reset-password.html`，由 Supabase Auth 恢复会话后调用 `updateUser()`。

## 发布前测试清单

1. 未登录访问 `/admin.html`：应显示登录页。
2. 错误密码：不应进入管理后台。
3. 普通用户登录：不应拥有管理权限。
4. 管理员新建草稿：公开首页不可见。
5. 管理员发布文章：公开首页可见。
6. 访客提交评论：评论状态应为 `pending`，前台不可见。
7. 管理员批准评论：前台显示。
8. 访客尝试更新评论：应被数据库权限拒绝。
9. 密码重置邮件应回到实际 GitHub Pages 的 `reset-password.html`，不应跳到 localhost。
10. 使用浏览器开发者工具确认没有暴露 service_role/secret key。

## 当前版本边界

这是无构建步骤的静态站点。为避免引入服务器，Markdown、Supabase JS 与 DOMPurify 使用 CDN 加载；离线或 CDN 被阻断时部分功能会受影响。匿名评论目前没有验证码/速率限制，正式公开前建议后续接入 Edge Function、Turnstile 或其他反滥用方案。评论邮件字段只用于预留，不会公开展示。
