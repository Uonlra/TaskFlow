### 1. 登录后读取任务列表的数据流

在 TaskFlow 中，浏览器不会直接请求 Appwrite，而是只访问本站的 Next.js API。

登录时，前端向 `/api/auth/login` 提交邮箱和密码。Next.js API Route 使用服务端环境变量调用 Appwrite 创建 Session，拿到 session secret 后，通过 `httpOnly Cookie` 写入浏览器。

之后访问任务列表时，浏览器自动携带这个 Cookie，请求 `/api/tasks`。Next.js API Route 从 Cookie 中读取 session secret，再使用它向 Appwrite 请求当前用户的任务数据，最后将任务结果返回给前端，前端再交给 Zustand 管理。

可以概括为：

```text
浏览器
  → /api/auth/login 或 /api/tasks
  → Next.js API Route
  → Appwrite Account / TablesDB
  → 返回认证结果或任务数据
  → Zustand 更新界面
```

### 2. Session secret 存在哪里？

Session secret 存在 `httpOnly Cookie` 中。

前端 JavaScript 无法通过 `document.cookie` 读取它，但浏览器会在请求本站 API 时自动携带该 Cookie。这样可以减少会话凭证暴露给页面脚本的风险。

服务端通过 Cookie 获取 session secret，并调用 Appwrite 验证当前会话和查询用户信息。

### 3. Appwrite API Key 放在哪里？

Appwrite API Key 只保存在服务端环境变量中，例如：

```env
APPWRITE_API_KEY=xxx
```

它不会使用 `NEXT_PUBLIC_` 前缀，也不会发送到浏览器。浏览器只请求 Next.js API，Appwrite 的敏感请求由服务端完成，这样可以避免 API Key 暴露在客户端代码或网络请求中。

### 4. 如何判断用户是否登录？

主要有两层判断：

1. `middleware` 检查受保护页面和接口是否存在 session Cookie。
2. API Route 再读取 session secret，并调用 Appwrite 查询当前账号。

如果 Cookie 缺失、Session 无效或无法获取当前用户，就返回 `401`。前端根据返回结果显示登录入口或跳转登录页。

### 5. 如何确保用户只能读取自己的任务？

创建任务时，服务端会为任务设置当前用户的 Row-level Permissions：

```text
read("user:<userId>")
update("user:<userId>")
delete("user:<userId>")
```

读取、更新和删除任务时，Appwrite 会根据当前 Session 检查权限。前端的用户 ID 主要用于状态隔离和初始数据校验，真正的资源权限由服务端 Session 和 Appwrite 权限规则共同保证。

### 6. 如何排查 401 和 403？

如果是 `401`，我会优先检查：

- 浏览器请求是否携带 `taskflow-session` Cookie；
- Cookie 的 `httpOnly`、路径、域名和环境配置是否正确；
- 服务端是否能读取 session secret；
- Appwrite Session 是否过期；
- `/api/auth/me` 是否能返回当前用户。

如果是 `403`，通常表示已经识别出用户，但没有访问目标资源的权限。我会检查：

- 当前 Session 对应的用户 ID；
- 创建任务时是否正确写入了 Row-level Permissions；
- 任务是否属于当前用户；
- Appwrite TablesDB 的 Row Security 配置；
- 服务端请求使用的数据库、表和项目配置是否正确。

在调试时，我会先查看 Chrome DevTools 的 Network 面板确认状态码、请求路径和响应内容，再结合服务端日志和 Appwrite 控制台检查配置；日志中不会输出 API Key 或完整 session secret。

这段回答的核心是：**前端不直接接触 Appwrite 敏感凭证，认证由 Cookie 维持，服务端 API 负责代理和校验，最终权限由 Appwrite Row-level Permissions 执行。**