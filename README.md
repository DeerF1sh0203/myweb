# 鹿鱼集

一个铅笔手绘风个人记录站，首页采用便当盒布局：

```text
index.html       首页：便当盒卡片网格
notes.html       副页面：随笔与文字
photos.html      副页面：照片展览
guestbook.html   副页面：飞鸽传书与公开留言展览板
about.html       副页面：关于与邮箱
admin.html       留言管理页
```

首页使用便当盒网格，由不同大小的圆角卡片组成：

```text
.card-hero        大号主视觉卡
.card-notes       随笔入口
.card-photos      照片入口
.card-mail        留言入口
.card-about       关于入口
.card-quote       底部金句卡
```

卡片大小、配色和链接入口都可继续扩展，后续新增内容时只需在 `index.html` 的 `.bento-grid` 中加入新的 `.bento-card`。

## 我们的记录（ours.html）

首页右上角有「我们的记录」小图标，点击后进入 `ours.html`。

- 页面内可以添加标题、日期、地点、文字和照片
- 记录保存在当前设备的 `localStorage` 中，不会同步到其他设备
- 该页面设置了 `noindex`，搜索引擎不会收录
- 页面没有加密，任何知道地址的人都能打开；如需真正私密，仍建议放在不公开的环境中

## 修改自己的内容

### 邮箱、留言接口和 Turnstile

打开 `data.js` 顶部的 `LUYU_CONFIG`：

```js
window.LUYU_CONFIG = {
  email: "your-email@example.com",
  location: "于日常",
  guestbookApi: "/api/messages",
  turnstileSiteKey: ""
};
```

- `email`：关于页和留言页展示的邮箱
- `location`：关于页的落款地点
- `guestbookApi`：Cloudflare 留言接口，部署后保持默认
- `turnstileSiteKey`：启用 Turnstile 后填写 Site Key

### 修改随笔

文章数据在 `data.js` 的 `LUYU_NOTES` 数组中。

页面上的「铺纸落笔」只会把文章保存到当前浏览器，其他人看不到。需要公开的文章应写入 `LUYU_NOTES`，再提交到 GitHub。

### 替换照片

照片数据在 `data.js` 的 `LUYU_PHOTOS` 数组中。

1. 把照片放进 `assets/photos/`
2. 修改对应条目的 `src`、`title`、`date`、`note` 和 `alt`
3. 推荐使用压缩后的 `.webp` 或 `.jpg`

目前六张图是水墨风示意占位图，可以直接替换。

### 修改样式

- `styles.css`：宣纸、水墨、文章卡片、照片、留言板等通用视觉
- `home.css`：铅笔手绘风便当盒布局与卡片样式
- `pages.css`：副页面标题、飞鸽转场和展览板布局

### 修改首页布局

- 首页结构：`index.html` 中的 `.bento-grid`
- 首页样式：`home.css`
- 主视觉卡：`.card-hero`
- 功能入口卡：`.card-notes`、`.card-photos`、`.card-mail`、`.card-about`
- 底部金句卡：`.card-quote`

调整配色时优先修改 `home.css` 顶部 `:root` 中的色值。

## 本地预览

直接打开 `index.html` 可预览所有页面和飞鸽动画。

由于留言需要后端接口，直接打开文件时留言板会显示「部署到 Cloudflare Pages 后即可使用」。

## 部署公开留言墙

推荐结构：

```text
GitHub                 保存代码
Cloudflare Pages       托管网站和运行 /api 接口
Cloudflare D1          保存留言
Cloudflare Turnstile   可选，防止机器人
Resend                 可选，新留言即时邮件通知
```

因为存在后端接口，不能只部署在 GitHub Pages 上。GitHub 仍然用于保存代码，网站应连接到 Cloudflare Pages。

### 1. 创建 D1 数据库

Cloudflare 控制台：

```text
Storage & Databases → D1 SQL Database → Create
```

建议数据库名称：

```text
deerfish-guestbook
```

创建后执行 `schema.sql` 中的全部 SQL。

### 2. 创建 Cloudflare Pages 项目

```text
Workers & Pages → Create → Pages → Connect to Git
```

选择 GitHub 仓库，构建设置：

```text
Framework preset: None
Build command: 留空
Build output directory: .
```

### 3. 绑定 D1

进入 Pages 项目：

```text
Settings → Bindings → Add → D1 database
```

设置：

```text
Variable name: DB
D1 database: deerfish-guestbook
```

变量名必须是 `DB`。

### 4. 设置环境变量

在 `Settings → Variables and Secrets` 中添加：

| 名称 | 是否必须 | 作用 |
|---|---|---|
| `ADMIN_TOKEN` | 必须 | 留言管理口令 |
| `RATE_LIMIT_SALT` | 建议 | 留言频率限制使用的随机盐 |
| `RESEND_API_KEY` | 可选 | Resend 邮件发送 Key |
| `NOTIFY_EMAIL` | 可选 | 新留言通知邮箱 |
| `NOTIFY_FROM` | 可选 | Resend 已验证发件人 |
| `TURNSTILE_SECRET_KEY` | 可选 | Turnstile 服务端密钥 |

### 5. 即时邮件通知

1. 注册 [Resend](https://resend.com/)
2. 创建 API Key
3. 配置 `RESEND_API_KEY`
4. 配置接收通知的 `NOTIFY_EMAIL`
5. 正式使用时验证域名，并配置 `NOTIFY_FROM`

没有 Resend Key 时，留言仍会保存并公开展示，只是不会即时发邮件。

### 6. Turnstile 防机器人

创建 Turnstile 站点后：

- `TURNSTILE_SECRET_KEY` 配置到 Cloudflare
- Site Key 写入 `data.js` 的 `turnstileSiteKey`

两个 Key 需要同时配置。

### 7. 管理留言

部署后访问：

```text
https://你的网站地址/admin.html
```

输入 `ADMIN_TOKEN` 后可以查看回信邮箱、隐藏留言或删除留言。公开页面永远不会返回访客邮箱。

## 留言安全

- 公开接口只返回称呼、正文和时间
- 访客邮箱只有管理页可见
- 每个 IP 与设备组合 5 分钟最多提交 3 条
- 表单含有机器人陷阱字段
- 支持 Cloudflare Turnstile
- D1 只能通过 Pages Functions 访问
- 留言通过纯文本渲染，避免 HTML 注入

## 文件说明

```text
index.html                        主页面
notes.html                        随笔副页面
photos.html                       照片副页面
guestbook.html                    留言副页面
about.html                        关于副页面
data.js                           随笔、照片、邮箱等配置
site.js                           公共导航、邮箱和光标
home.css                          铅笔手绘风便当盒
notes.js                          随笔交互
photos.js                         照片大图浏览
guestbook.js                      公开留言
about.js                          关于页统计
ours.js                           私密窗口交互
ours.css                          私密窗口手绘样式
styles.css                        通用水墨视觉
pages.css                         主页面与副页面的新布局
functions/api/messages.js         公开留言接口
functions/api/admin/messages.js   留言管理接口
schema.sql                        D1 表结构
wrangler.toml                     Cloudflare 配置
admin.html                        留言管理页
```










