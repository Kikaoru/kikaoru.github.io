# 大薯ki 静态博客 · 内容后台说明

这是一个不需要服务器的静态站点。
你只需要改两个地方：

- `content/settings.json`：主页标题、简介、各栏标题、引语、页脚等设置
- `content/posts/*.md`：每一篇文章的 Markdown 正文

改完双击 **`更新网站.bat`**，脚本会重新生成：

- `index.html`（主页）
- `posts/<文件名>.html`（每篇文章的阅读页）

然后双击 `index.html` 就能看。整个过程不需要开服务器，也不需要懂 HTML。

---

## 一、最常用：改主页标题和简介

打开 `content/settings.json`，找到 `hero`：

```json
"hero": {
  "eyebrowLeft": "PERSONAL BLOG",
  "eyebrowRight": "好奇心过载",
  "titleMain": "大薯",
  "titleAccent": "ki",
  "tagline": ["理工脑", "游戏宅", "二次元", "技术折腾党"],
  "intro": "大约二十岁。好奇心比知识储备多一点……",
  "note": "不是客服，不装成熟。只是刚好住在这个网页里。"
}
```

- `titleMain` 是主页大字标题的前半段，`titleAccent` 是后半段（会显示成渐变斜体）。
- `intro` 是主页简介。
- `tagline` 是简介上方那排用 ✦ 分隔的词。
- 每段文字里的 `\n` 表示换行。
- 改完后双击 `更新网站.bat`。

浏览器标签页标题在 `site.title`，页面描述在 `site.description`。

---

## 二、写一篇文章

在 `content/posts/` 里新建一个 `.md` 文件，例如：

`content/posts/my-first-post.md`

文件开头必须有一段 frontmatter：

```md
---
title: 文章的标题
summary: 显示在主页「最近」卡片上的一句简介。
date: 2026-10-25
tag: 日常
order: 10
---

正文从这里开始。

## 一个小标题

这里是正文。
```

字段说明：

| 字段 | 作用 | 是否必填 |
| --- | --- | --- |
| `title` | 文章标题，也显示在主页卡片上 | 建议填 |
| `summary` | 主页卡片的简介，也是文章页的导语 | 建议填 |
| `date` | 日期，支持 `2026-10-25` 或 `2026.10.25` | 建议填 |
| `tag` | 卡片上的分类标签 | 否，默认「随笔」 |
| `order` | 日期相同时的排序，越小越靠前 | 否 |
| `draft` | 写 `true` 时这篇文章不会生成 | 否 |
| `slug` | 网址文件名，不填就用文件名 | 否 |

主页「最近」会自动读取这个文件夹里的文章，按日期从新到旧排列。
点主页卡片会进入这篇 Markdown 的阅读页；阅读页底部有「查看 Markdown 原文」可以直接打开 `.md` 文件。

> 文件名尽量用英文、数字和短横线，例如 `my-first-post.md`，这样网址更干净。
> 如果用的中文文件名也没关系，生成器会自动处理链接。

---

## 三、Markdown 支持范围

构建脚本内置了轻量 Markdown 转换，支持：

- `## 标题` / `### 标题`
- **粗体**、*斜体*、~~删除线~~
- 无序列表、有序列表
- 引用块 `>`
- 链接 `[文字](https://example.com)`
- 图片 `![说明](image.png)`
- 行内代码和 ``` 代码块
- 表格
- 分割线

图片可以放在 `content/posts/` 里，正文写：

```md
![图片说明](my-image.png)
```

构建时会自动把相对路径解析到 `content/posts/` 目录。

---

## 四、其他可改内容

`content/settings.json` 里还可以改：

- `sections`：关于我 / 快乐清单 / 最近 / 和我说句话 的英文小标、标题、强调字和简介
- `quotes`：主页轮播的「薯言薯语」
- `footer`：页脚文案
- `hero.tags`：主页关键词标签

更细的正文卡片（比如「快乐清单」里的六个卡片）目前还写在 `template/index.template.html` 里，属于高级修改。
如果以后想把它们也搬进设置文档，可以继续扩展。

---

## 五、文件说明

```text
dashuki-site/
├─ index.html                 ← 生成的主页，不要手改
├─ posts/                     ← 生成的文章页，不要手改
├─ content/
│  ├─ settings.json           ← 主页设置（要改这里）
│  └─ posts/*.md              ← 文章源文件（要改这里）
├─ assets/
│  ├─ style.css / app.js      ← 主页样式和交互
│  ├─ article.css / article.js← 文章页样式和交互
│  ├─ avatar.jpg              ← 头像，想换直接替换这个文件
│  └─ head-theme.js           ← 日夜主题初始化
├─ template/                  ← 页面模板，高级修改用
├─ build.mjs                  ← 生成器
├─ 更新网站.bat               ← 双击运行
└─ README.md
```

**注意：** `index.html` 和 `posts/` 是生成产物，重新构建会覆盖它们。
要改内容，请改 `content/` 里的文件；要改设计，再改 `assets/` 或 `template/`。

---

## 六、需要 Node.js

生成器使用 Node.js，本机已经可用。
如果换到别的电脑，先安装 [Node.js](https://nodejs.org/)，再双击 `更新网站.bat`。

构建失败时，双击 bat 后窗口里会显示具体原因（常见原因是 JSON 少了逗号、引号没闭合，或 frontmatter 格式不对）。
