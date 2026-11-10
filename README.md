# dsh-notify

> 给 DeepSeek Harness 用的 Windows 桌面通知插件：任务跑完、需要你批准、或等你回答问题时，用系统通知提醒你。

[![npm](https://img.shields.io/npm/v/@teyvat0/dsh-notify)](https://www.npmjs.com/package/@teyvat0/dsh-notify)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue.svg)](#要求与兼容性)
[![DSH plugin](https://img.shields.io/badge/DSH-plugin-4B32C3.svg)](#安装)

## 简介

DeepSeek Harness 经常在后台跑长任务：整理文件、跑测试、查资料。任务结束或停在审批上时，只有回到窗口才看得到，容易白等或忘掉。

dsh-notify 把三种需要你留意的状态转成 Windows 系统通知，让你可以安心切去别的窗口做事：

| 时机 | 触发条件 | 通知内容 |
| --- | --- | --- |
| 运行结束 | 主会话从「运行中」变为「空闲」 | 会话标题 |
| 需要批准 | 出现工具审批请求 | 工具名与请求原因 |
| 需要回答 | 出现提问或计划评审 | 问题摘要 |

## 特性

- 三种时机都能提醒，审批和提问共用一套逻辑，不会漏。
- 默认只在 DSH 不在前台时弹出；正看着 DSH 时不打扰，可在设置里改成总是提醒。
- 结束提醒延迟约 1.2 秒，给「刚跑完就停下来问你」的场景留合并窗口，避免连弹两条。
- 六种提示音：系统默认、清脆、低沉、双响、自定义音频、静音；音量 0–100% 可调。
- 点击通知把 DSH 切回前台；对应的状态解除后，通知自动收起。
- 子代理会话结束不单独提醒，并发子代理不会刷屏。
- 内置诊断面板与 45 项回归测试，排查「为什么没弹」时有据可查。

## 安装

需要 DSH 桌面端（Electron）。在插件管理里安装，装完 `Ctrl + R` 刷新窗口或重启 DSH：

1. 打开左侧栏的插件管理，点「+」安装第三方插件。
2. 选择本地目录，或直接填入包名 `@teyvat0/dsh-notify`。
3. 确认插件显示为已启用，刷新窗口。

也可以让 Agent 代装：

```text
plugin_manager action=install_bundle target="@teyvat0/dsh-notify"
```

从源码安装：

```sh
git clone https://github.com/Teyvat0/dsh-notify.git
```

再把克隆下来的目录按上面的本地目录方式装进插件管理。

> npm 包只是分发渠道。只把它加进 profile 依赖不会被加载，还需要在插件管理里安装一次——这一步会把插件登记到 profile 的 bundle 列表。

## 使用

安装后，「设置」左侧菜单会多出一项「通知」（铃铛图标），所有开关都在这一页：

| 设置项 | 作用 |
| --- | --- |
| 提醒声音 | 系统默认 / 清脆 / 低沉 / 双响 / 自定义文件 / 静音 |
| 提醒音量 | 0–100%，默认 80%；只作用于插件自己播放的声音 |
| 总是弹窗提醒 | 开启后 DSH 在前台也弹；关闭则只在切到其他窗口时提醒 |
| 发送测试 | 立刻弹一条，正文带版本号、时间、焦点状态和提示音名称 |
| 诊断信息 | 最近 16 条判定记录，排查「为什么没弹」时先看它 |

几点说明：

- 首次加载会弹一条「DSH 通知已开启」，用来确认系统通知链路畅通，每个页面会话一次。
- 除「系统默认」外，通知以静音方式发出、由插件自己出声，避免和 Windows 自带提示音叠成两声。
- 自定义音频通过文件选择器读入，保存在本机的渲染进程存储里，不上传、不写插件目录；解码失败时退回短提示音。
- 「总是弹窗提醒」会持久保存，重启 DSH 后仍然生效。

## 要求与兼容性

| 项目 | 说明 |
| --- | --- |
| 操作系统 | Windows 10 / 11，已实测 |
| 运行环境 | DSH 桌面端（Electron） |
| 网络 | 不需要联网 |
| 外部依赖 | 无，不需要 PowerShell、BurntToast 或 AUMID 快捷方式 |
| 其他平台 | macOS / Linux 的 Electron 大概率也能弹，但未验证，焦点判定可能不同 |

通知走渲染进程的标准 Web Notification 接口，由 Electron 转成 Windows Toast。

## 工作原理

<details>
<summary>展开查看</summary>

插件只有一个客户端半部，Host 半部的 `index.js` 是空的。

1. 订阅运行时会话状态（`Map<sessionId, { running, pendingInteraction }>`），对每个会话做运行状态的边沿检测。
2. 从「运行中」变为「空闲」且没有待处理交互时，延迟 1.2 秒再发「运行结束」；这段时间内冒出审批或提问，就改走交互分支。
3. 是否出声、以及 DSH 在前台时是否也弹，由「总是弹窗提醒」开关和窗口焦点状态共同决定。
4. 交给 Chromium 的通知 tag 是逻辑 tag 的哈希短别名，原因见下面的修复记录。

</details>

## 排查

收不到通知时，按顺序检查：

1. 打开「设置 → 通知」，点「发送测试」。这一步能弹，说明通知通道正常。
2. 看同一页的「诊断信息」：里面有最近 16 条判定记录，会写清楚是没触发、被开关拦下，还是已经发出。
3. 检查 Windows 设置 → 系统 → 通知：DeepSeek Harness 是否允许通知，专注助手或勿扰模式是否在拦截。
4. 如果只是 DSH 在前台时不弹，把「总是弹窗提醒」打开。

## 修复记录：长 tag 被 Windows 丢弃

<details>
<summary>展开查看</summary>

1.0–1.3.2 期间「运行结束」一直不弹，但欢迎通知和「发送测试」正常。诊断日志显示判定链全部通过、通知对象也创建成功，屏幕上却没有出现。

两个测试按钮走同一套发送逻辑，唯一差别是 tag 长度：

| 探测 | tag 长度 | 结果 |
| --- | --- | --- |
| 发送测试 | 15 | 弹出 |
| 长标签自检 | 64 | 不弹 |

Windows toast 的 tag 字段有很短的字符上限，超长时系统丢弃该通知，而 Chromium 不抛异常，插件于是误判成功。运行结束的 tag 是 `dsh-notify:complete:session-<UUID>`（64 字符），审批和提问的更长（100+），所以全部静默失败。

1.3.3 起，逻辑 tag 仍用于去重、按前缀关闭和点击跳转，真正交给 Chromium 的是 djb2 哈希得到的短别名（`dsh` 加 base36，不超过 16 字符，冲突自动加盐）。复现根因用的「长标签自检」按钮已在 1.3.4 撤掉。

</details>

## 开发

没有构建步骤：`client.js` 由 `window.__ModuleLoader__.load()` 注册，`index.js` 是空的 Host 半部，改完 `Ctrl + R` 刷新窗口即可生效。

```text
plugins/dsh-notify/
├─ client.js         客户端半部（通知判定、设置页、声音）
├─ index.js          Host 半部（空）
├─ cordis.patch.yml  插件注册补丁
├─ locale/           zh / en 文案
├─ test/verify.mjs   回归测试（mock 宿主，不需要 DSH）
└─ icon.svg
```

回归测试不需要安装依赖，直接用 Node 运行：

```sh
node plugins/dsh-notify/test/verify.mjs
```

当前 45 项断言，覆盖设置分区与设置行注册、开关与音量、焦点判断、正文截断、子代理会话排除，以及「交给 Chromium 的 tag 不超过 16 字符」。

## 许可证

[MIT](LICENSE)
