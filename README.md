# dsh-notify

Windows toast notifications for [DeepSeek Harness](https://github.com/deepseek-ai) — a run finished, an approval is needed, or a question is waiting.

DSH 跑完一轮、要你批准工具调用、或等你回答问题时，弹一条 Windows 系统通知。窗口在后台也能收到，不用守着屏幕。

## 为什么

DSH 桌面端的窗口经常被切到后台（浏览器、编辑器、游戏）。任务跑完或停在审批上时，它不会主动叫你，只能隔一会儿回去看一眼。这个插件把三种需要你注意的状态映射成系统 Toast：

| 时机 | 触发条件 | 通知正文 |
| --- | --- | --- |
| 运行结束 | 主会话 `running` 从 `true` 变 `false` | 会话标题 |
| 需要批准 | 工具审批请求出现 | 工具名 + 请求原因 |
| 需要回答 | 提问或计划评审出现 | 问题摘要 |

- **默认只在你切到其他窗口时提醒**；正看着 DSH 时不打扰。想让它一直提醒，打开「设置 → 通知 → 总是弹窗提醒」。
- 结束提醒延迟约 1.2 秒：给「跑完立刻停下来问你」的场景一个合并窗口，避免一次操作弹两条通知。
- 点击通知会把 DSH 窗口切到前台；对应状态解除后，通知自动关闭。
- 子代理会话结束不单独提醒，避免并发子代理刷屏。
- 首次加载会弹一条「DSH 通知已开启」，用来确认系统通知链路是通的（每个页面会话一次）。

## 安装

本插件是纯客户端插件，没有构建步骤。

### 从源码目录安装

```sh
git clone https://github.com/Teyvat0/dsh-notify.git
```

在 DSH 左侧栏「插件」→ 右上角「+」→「安装第三方插件」→ 选「本地目录」，选中克隆下来的 `dsh-notify` 文件夹，按提示重启（或 `Ctrl + R` 刷新窗口）。

也可以直接让 Agent 装：

```text
plugin_manager action=install_bundle target="<绝对路径>/dsh-notify"
```

### npm（尚未发布）

计划发布为 `@teyvat0/dsh-notify`。发布后可以：

```sh
dsh plugin --profile desktop add @teyvat0/dsh-notify
```

## 设置

安装后，DSH 的「设置」左侧菜单会多出一项 **通知**（铃铛图标），所有开关都在那一页：

| 设置项 | 作用 |
| --- | --- |
| 提醒声音 | 系统默认 / 清脆 / 低沉 / 双响 / 自定义文件 / 静音 |
| 提醒音量 | 0–100%，默认 80%；只作用于插件自己播放的声音 |
| 总是弹窗提醒 | 开启后 DSH 在前台也弹；关闭则只在切到其他窗口时提醒 |
| 发送测试 | 立刻弹一条，正文带版本号、时间、焦点状态和提示音名称 |
| 诊断信息 | 最近 16 条判定记录，排查「为什么没弹」时先看它 |

- 除「系统默认」外，通知以 `silent: true` 发出、由插件自己出声，避免和 Windows 自带提示音叠成两声。
- 自定义音频通过文件选择器读入，存在本机渲染进程的 IndexedDB 里，不上传、不写插件目录；解码失败时退回短提示音。
- 「总是弹窗提醒」存在 localStorage，重启 DSH 后仍生效。

## 要求与兼容性

- DSH 桌面端（Electron）。通知走渲染进程的 `new Notification()`，由 Electron 转成 Windows Toast；不需要 PowerShell、BurntToast、AUMID 快捷方式或任何外部程序，也不联网。
- 在 Windows 10/11 上实测。macOS / Linux 的 Electron 应该也能弹，但未做验证，焦点判定可能不同。
- 如果收不到通知，先查 Windows 设置 → 系统 → 通知：DeepSeek Harness 是否允许、专注助手 / 勿扰模式是否拦截。

## 工作原理

插件只有一个客户端半部，Host 半部 `index.js` 是空的。

1. 订阅 `ctx.uiSession.sessionStatus`（`Map<sessionId, { running, pendingInteraction }>`），对每个会话做 `running` 的边沿检测。
2. `true → false` 且没有 pending 交互时，延迟 1.2 秒再发「运行结束」；在此期间冒出审批 / 提问则改走 pending 分支。
3. 是否出声、是否在 DSH 前台时也弹，由「总是弹窗提醒」开关和 `document.hasFocus()` 共同决定。
4. 交给 Chromium 的 tag 是逻辑 tag 的哈希短别名（见下）。

## 修复记录：长 tag 被 Windows 丢弃

1.0–1.3.2 里「运行结束」一直不弹，但欢迎通知和「发送测试」正常。诊断日志显示判定链全部通过、`new Notification()` 也返回成功，只是屏幕上没有出现。

A/B 两个按钮走同一套 `show()`，唯一差别是 tag 长度：

| 探测 | tag 长度 | 结果 |
| --- | --- | --- |
| 发送测试 | 15 | 弹出 |
| 长标签自检 | 64 | 不弹 |

Windows toast 的 tag 字段有很短的字符上限，超长时 WinRT 丢弃该通知，而 Chromium 不抛异常，插件于是误判成功。运行结束的 tag 是 `dsh-notify:complete:session-<UUID>`（64 字符），审批 / 提问的更长（100+），所以全部静默失败。

1.3.3 起：逻辑 tag 仍用于去重、按前缀关闭和点击跳转，真正交给 Chromium 的是 djb2 哈希得到的短别名（`dsh` + base36，≤10 字符，冲突自动加盐）。复现根因用的「长标签自检」按钮已在 1.3.4 撤掉。

## 开发

没有构建步骤：`client.js` 由 `window.__ModuleLoader__.load()` 注册，`index.js` 是空的 Host 半部。

```text
plugins/dsh-notify/
├─ client.js         客户端半部（通知判定、设置页、声音）
├─ index.js          Host 半部（空）
├─ cordis.patch.yml  插件注册补丁
├─ locale/           zh / en 文案
├─ test/verify.mjs   回归测试（mock 宿主，不需要 DSH）
└─ icon.svg
```

只改 `client.js` 时不需要重启 DSH，`Ctrl + R` 刷新窗口即可。回归测试：

```sh
node plugins/dsh-notify/test/verify.mjs
```

当前 45 项断言，覆盖设置分区与四行注册、开关与音量、焦点门、正文截断、子代理会话排除，以及「交给 Chromium 的 tag 不超过 16 字符」。

## 许可证

[MIT](LICENSE)
