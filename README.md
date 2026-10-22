# Hete3ks — 综合个人博客

这是一个可部署到 GitHub Pages 的静态前端博客，并使用 Supabase 提供在线文章数据库与邮箱密码认证管理后台。

## 项目包含

- `index.html` / `style.css`：公开博客页面，响应式布局、分类筛选、搜索、文章详情、主题切换
- `admin.html` / `admin.css`：管理后台登录、文章新增/编辑/删除、草稿/发布
- `app.js` / `admin.js`：前端逻辑
- `config.js`：Supabase 项目 URL 和 anon/public key
- `schema.sql`：数据库表、Row Level Security (RLS) 策略和管理员检查函数
- `posts.js`：Supabase 未配置时展示的示例文章

## 架构与安全

GitHub Pages 只托管静态文件，**不能运行安全的服务器端登录服务**。因此本项目使用 Supabase Auth + PostgreSQL + RLS：
- 前端只使用 Supabase Project URL 和 anon/public key，这两个值不是服务端秘密。
- 数据访问权限由数据库 RLS 强制执行；非管理员只能读取已发布文章，不能新增、修改或删除文章。
- 管理员身份依赖 `app_metadata.role = "admin"`，普通用户不能自行修改 app_metadata。
- 不要把 Supabase `service_role` key 或数据库密码放进前端文件、GitHub 仓库或公开页面。

## 一、创建 Supabase 后端

1. 登录 https://supabase.com/ 并创建项目。保存数据库密码到自己的密码管理器，不要提交到 GitHub。
2. 打开项目的 **SQL Editor**，新建查询，将本项目 `schema.sql` 全部复制进去并运行。
3. 打开 **Project Settings → API**（部分新界面在 Connect / API Keys 中），复制 Project URL 和 `anon` / publishable 公钥。
4. 编辑 `config.js`，填写：

   ```js
   window.BLOG_CONFIG = {
     SUPABASE_URL: "https://你的项目ID.supabase.co",
     SUPABASE_ANON_KEY: "你的anon或publishable公钥"
   };
   ```

   不要填写 `service_role` / secret key。

5. 打开 **Authentication → Settings**，关闭允许新用户注册（Allow new users to sign up / Enable Sign Ups，具体标签可能随 Supabase 界面变化）。后台不提供公开注册。
6. 打开 **Authentication → Users**，创建自己的用户，使用你控制的邮箱和强密码。
7. 给该用户授予管理员 app metadata。可使用 Supabase Dashboard 中该用户的 Edit user / Raw app meta data，将其设为：

   ```json
   {"role":"admin"}
   ```

   这必须是 **app_metadata**，不是 user_metadata。若当前 Dashboard 不提供编辑 app metadata 的入口，请使用 Supabase 官方支持的管理方式或可信的服务端管理脚本；不要在浏览器控制台或前端代码里使用 service_role key。
8. 如更改了 app_metadata，请退出后台并重新登录，让新的身份信息进入登录令牌。

## 二、本地运行

推荐使用 Python 内置静态服务器（Windows 已安装 Python 时）：

1. 解压项目。
2. 在项目目录地址栏输入 `cmd` 并回车。
3. 运行：

   ```powershell
   python -m http.server 8000
   ```

4. 打开 `http://localhost:8000` 查看公开博客。
5. 打开 `http://localhost:8000/admin.html` 登录管理后台。

若 Supabase 配置未填写，首页显示演示文章，管理后台会提示需要配置。正式管理功能需要先完成 Supabase 设置。

## 三、部署到 GitHub Pages

1. 登录 GitHub，创建一个仓库，例如 `hete3ks-blog`。建议使用 Public 仓库以便 GitHub Pages 免费发布。
2. 上传项目文件到仓库根目录，确认 `index.html`、`admin.html`、`config.js` 等文件都在根目录，而不是多套一层文件夹。
3. 在仓库打开 **Settings → Pages**。
4. 在 **Build and deployment** 选择 **Deploy from a branch**，Branch 选 `main`，目录选 `/(root)`，点击 Save。
5. 等待部署完成，页面会显示网站地址，通常形如 `https://你的用户名.github.io/hete3ks-blog/`。
6. 访问博客首页；后台路径是同一站点下的 `/admin.html`。
7. 每次更新文件并推送到 `main`，GitHub Pages 会重新发布。

## 四、配置完成后如何写文章

1. 访问 `https://你的用户名.github.io/hete3ks-blog/admin.html`。
2. 使用你在 Supabase 创建并授权的管理员邮箱与密码登录。
3. 填写标题、分类、摘要、封面符号、颜色和正文。
4. 状态选择“草稿”并保存，文章只在后台可见；选择“已发布”并保存，文章会显示在博客首页。
5. 在文章列表中可以编辑或删除文章。删除前会弹出确认。

正文编辑框接受 HTML 片段，例如：

```html
<p>这是一个段落。</p>
<h2>小标题</h2>
<p>这里是正文内容。</p>
<blockquote>值得记下的一句话。</blockquote>
<ul><li>第一点</li><li>第二点</li></ul>
```

## 五、重要注意事项

- 本项目的正文编辑是基础 HTML 编辑器，不是所见即所得编辑器；如果要插入图片，可使用可公开访问的图片 URL 并使用 `<img src="https://...">`，注意版权与可用性。
- GitHub Pages 是静态托管，不要把数据库密码、Supabase service role key、个人令牌写进任何前端文件。
- RLS 是数据权限的核心。不要为了“修复报错”而关闭 RLS 或创建 `using (true)` 的写入策略。
- Supabase 免费计划的配额、休眠策略和控制台界面可能变化，请以当前项目控制台为准。
- 公开文章正文以 HTML 存储并渲染。只把自己撰写或可信来源的内容放入正文；不要提供给不可信用户任意写入 HTML 的权限。
- 发布之前，先使用测试文章验证：匿名用户可以读取已发布文章但看不到草稿；非管理员无法写入；管理员可以完成文章 CRUD。
