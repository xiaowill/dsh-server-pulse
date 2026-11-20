# DSH 插件仓库调研

2026-11-21 查阅了 DSH 官方文档和三个插件的一手资料。Better Sidebar 与 dsh-market 用于比较社区项目的首页和发布方式，Remote SSH 用于比较同样通过 SSH 连接服务器的插件如何解释配置与前置条件。

## 参考项目

GitHub API 当天记录 Better Sidebar 5,267 Stars、dsh-market 13,073 Stars。Remote SSH 用于对照 SSH 连接的产品流程。[Better Sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) · [dsh-market](https://github.com/dsh-market/dsh-market)

| 项目 | 仓库首页 | 开发与发布 |
| --- | --- | --- |
| DSH Better Sidebar | 开头一句话交代右侧栏、底部面板及扩展服务，紧接演示与功能表。安装部分按宿主版本给出固定版本命令，FAQ 对照常见症状和处理方法。[README](https://github.com/omdsh-dev/DSH-better-sidebar/blob/main/README.md) | README 简述宿主与客户端的职责，提供构建和真实宿主挂载测试命令。v0.32.1 发布页列出兼容版本、本版变更和验证范围。随包附中文、英文插件详情和两张示意图。[README 开发部分](https://github.com/omdsh-dev/DSH-better-sidebar/blob/main/README.md#L224-L235) · [v0.32.1](https://github.com/omdsh-dev/DSH-better-sidebar/releases/tag/v0.32.1) |
| dsh-market | 开头说明可以搜索、安装和更新插件。分别说明官方 Desktop、普通 Web、独立 profile 的安装方法，给出预构建 tarball 路径及装好后在应用中从哪里打开。[README 安装部分](https://github.com/dsh-market/dsh-market#install) | 包清单区分宿主导出、Web 客户端和 bundle patch。测试文档记录行为、组件和真实 Web 安装链路各自验证的范围。v1.73.25 发布页精简到 npm 版本、dist-tag 和相邻版本的 diff。[包清单](https://github.com/dsh-market/dsh-market/blob/main/package.json) · [测试文档](https://github.com/dsh-market/dsh-market/blob/main/TESTING.md) · [v1.73.25](https://github.com/dsh-market/dsh-market/releases/tag/v1.73.25) |
| dsh-remote-ssh | 用截图标出配置入口、文件页签和终端页签。安装前列出 DSH 版本、Better Sidebar 关系、本机 SSH 客户端和远端 sshd，接着说明配置、测试连接和使用路径。[中文 README](https://github.com/ZhangFengshun/dsh-remote-ssh/blob/main/README.md) | 包清单分别导出宿主与客户端模块。维护文档说明真实模块加载冒烟如何发现仅测试片段时漏掉的问题。v2.4.48 发布页把变更、测试与指定网络条件下的性能测量列在一起。[包清单](https://github.com/ZhangFengshun/dsh-remote-ssh/blob/main/package.json) · [维护文档](https://github.com/ZhangFengshun/dsh-remote-ssh/blob/main/MAINTENANCE.md) · [v2.4.48](https://github.com/ZhangFengshun/dsh-remote-ssh/releases/tag/v2.4.48) |

## DSH 官方安装入口

- CLI 支持将本地 checkout、本地 pack 产物、npm 包或 GitHub 源码装入指定 profile。GitHub 安装可固定到 commit。需要构建的源码需提供 `prepare` 并由用户放行构建脚本，预构建包可以直接分发。`--dump-config` 可确认 bundle 进入组合，实际打开页面仍需要启动宿主验证。[官方打包与安装指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- Web 的 Plugins → Add plugin 安装框接受包名、Git 仓库或本地目录。Discover 需要启用实验性的 Custom plugin indexes 并手动添加来源。官方建议公开插件仓库添加 `dsh-plugin` topic，便于发现。[插件管理器](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-plugin-manager/README.md) · [插件索引](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/plugin-market.md) · [官方仓库](https://github.com/deepseek-ai/deepseek-harness#community-and-support)
- Plugins 的长说明取随包发布的 locale 文件中 `meta.detail` 指向的 Markdown，缺省时取随包发布的 README。用于详情页的 Markdown 和图片须包含在安装包里。[官方包清单指南](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/adding-a-package.md) · [插件管理器](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-plugin-manager/README.md)

## 对本仓库的取舍

- README 首屏用当前监控面板截图、用途和安装入口回答用户能看到什么、如何装上。把支持的 DSH 版本、运行 DSH 的机器及其到 Linux 主机的 SSH 前置条件放在命令附近。装好后给出左侧栏入口、第一台主机的配置位置及「测试 SSH」的验证步骤。[Better Sidebar 安装说明](https://github.com/omdsh-dev/DSH-better-sidebar/blob/main/README.md#-installation) · [Remote SSH 快速上手](https://github.com/ZhangFengshun/dsh-remote-ssh/blob/main/README.md#使用)
- 开发文档说明宿主入口、Web 入口、bundle 挂载以及实际采用的验证命令。发布说明写清对应宿主版本、安装命令、用户可见改动和本版实际验证范围。有可下载的版本产物时，给出与版本号对应的安装包链接。[dsh-market 测试文档](https://github.com/dsh-market/dsh-market/blob/main/TESTING.md) · [dsh-market 发布页](https://github.com/dsh-market/dsh-market/releases/tag/v1.73.25) · [Better Sidebar 发布页](https://github.com/omdsh-dev/DSH-better-sidebar/releases/tag/v0.32.1)
