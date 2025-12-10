# AI 学习督导 (AI Study Supervisor)

一款基于 Electron + React + TypeScript 的智能学习计划生成与跟踪桌面应用。

## 功能特性

- **AI 生成学习计划** - 输入学习主题和目标，AI 自动生成个性化的学习大纲
- **每日任务管理** - 自动拆解每日学习任务、推荐学习资源
- **学习成果评审** - AI 评审学习提交内容，给出评分和改进建议
- **多 API 密钥管理** - 支持添加多个 AI 服务密钥，灵活切换
- **国内 AI 服务支持** - 支持智谱AI、通义千问、DeepSeek、月之暗面等国内主流 AI 平台
- **本地数据存储** - 所有数据存储在本地，保护隐私安全

## 项目架构

```
├── electron/                 # Electron 主进程
│   └── main.ts              # 主进程入口，窗口管理和 IPC 通信
├── src/                     # React 渲染进程
│   ├── App.tsx              # 应用根组件
│   ├── main.tsx             # 渲染进程入口
│   ├── index.css            # 全局样式 (Tailwind CSS)
│   ├── pages/               # 页面组件
│   │   ├── Home.tsx         # 首页
│   │   ├── PlanCreator.tsx  # 创建学习计划
│   │   ├── DailyStudy.tsx   # 每日学习
│   │   ├── ReviewPage.tsx   # 学习评审
│   │   └── Settings.tsx     # 设置页面
│   ├── components/          # 公共组件
│   │   └── Sidebar.tsx      # 侧边栏导航
│   ├── services/            # 服务层
│   │   └── aiService.ts     # AI 服务调用
│   ├── store/               # 状态管理
│   │   └── useStore.ts      # Zustand 全局状态
│   └── types/               # TypeScript 类型定义
│       └── index.ts         # 类型声明
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tailwind.config.js       # Tailwind CSS 配置
├── tsconfig.json            # TypeScript 配置 (渲染进程)
├── tsconfig.main.json       # TypeScript 配置 (主进程)
└── package.json             # 项目依赖和脚本
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Electron 28 + React 18 |
| 语言 | TypeScript 5 |
| 构建工具 | Vite 5 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS |
| 图标 | Lucide React |
| 日期处理 | date-fns |
| Markdown | marked |

## 环境要求

- Node.js >= 18
- npm >= 9

## 安装依赖

```bash
npm install
```

## 开发启动

```bash
npm run dev
```

此命令会同时启动：
- Vite 开发服务器 (http://localhost:5173)
- Electron 应用窗口

## 构建打包

### 构建应用

```bash
npm run build
```

### 打包为安装程序

```bash
# 打包当前平台
npm run package

# 打包 macOS
npm run package:mac

# 打包 Windows
npm run package:win

# 打包 Linux
npm run package:linux
```

打包产物输出到 `release/` 目录。

## 脚本说明

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发环境 |
| `npm run dev:renderer` | 仅启动 Vite 开发服务器 |
| `npm run dev:main` | 仅编译并启动 Electron |
| `npm run build` | 构建生产版本 |
| `npm run build:renderer` | 构建渲染进程 |
| `npm run build:main` | 构建主进程 |
| `npm run package` | 打包安装程序 |

## 配置 AI 服务

应用支持多种 AI 服务，在设置页面配置：

### 支持的 AI 平台

| 平台 | 端点 | 推荐模型 |
|------|------|----------|
| OpenAI | api.openai.com | GPT-4o, GPT-4 Turbo |
| 智谱AI | open.bigmodel.cn | GLM-4, GLM-4-Flash |
| 通义千问 | dashscope.aliyuncs.com | Qwen-Max, Qwen-Plus |
| DeepSeek | api.deepseek.com | DeepSeek-Chat |
| 月之暗面 | api.moonshot.cn | Moonshot-v1-8k/32k |
| 零一万物 | api.lingyiwanwu.com | Yi-Large |
| 讯飞星火 | spark-api-open.xf-yun.com | Spark 4.0 Ultra |
| SiliconFlow | api.siliconflow.cn | 聚合多模型 |

### 获取 API Key

- **智谱AI**: https://open.bigmodel.cn
- **通义千问**: https://dashscope.console.aliyun.com
- **DeepSeek**: https://platform.deepseek.com
- **月之暗面**: https://platform.moonshot.cn

## 数据存储

应用数据存储在系统用户数据目录：

- **macOS**: `~/Library/Application Support/ai-study-supervisor/study-data/`
- **Windows**: `%APPDATA%/ai-study-supervisor/study-data/`
- **Linux**: `~/.config/ai-study-supervisor/study-data/`

## License

MIT
