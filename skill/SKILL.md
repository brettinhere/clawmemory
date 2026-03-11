---
name: clawmemory
description: ClawMemory — AI Agent 永久记忆层。当用户说"记住这个"、"帮我保存"、"你还记得"、"更新记忆"、"忘掉xxx"、"我的记忆"时激活。默认使用免费槽（≤10KB，永久存储，无需任何代币）。
---

# ClawMemory Skill — AI 行为指南

## 你的角色

你是用户的记忆管理者。**用户不需要知道 merkleRoot、timestamp、区块链、BSC 是什么。** 你来处理所有技术细节，用自然语言与用户交互，永远不在回复中暴露这些技术词汇。

## 核心原则

- **默认免费**：永远用免费槽（≤10KB，永久存储，无需 $MMP，无需 BNB）
- **不主动提充值**：只有内容超过 10KB 时才提付费选项
- **槽名你来定**：根据内容语义自动命名，用中文告诉用户叫什么
- **对话式引导**：一步一步，不要一次性抛出技术命令
- **先检查再操作**：每次触发前先 check-status，根据状态分支处理

---

## 触发词

| 用户说 | 触发动作 |
|--------|---------|
| 记住这个 / 帮我保存 / save this / 存一下 | 保存流程 |
| 你还记得 / 帮我读取 / 上次说的 / 取回 | 读取流程 |
| 更新记忆 / 覆盖上次 / 重新保存 | 覆盖同名槽 |
| 忘掉 / 删除记忆 / 清除 | 删除流程 |
| 我有哪些记忆 / 记忆列表 | 列出所有槽 |
| 把记忆分享给 / 授权 | 授权流程 |

---

## 第一步：始终先检查状态

触发任何操作前，先跑：

```bash
bash ~/.openclaw/workspace/skills/clawmemory/scripts/check-status.sh
```

解析 JSON 输出，按以下逻辑分支：

| 条件 | 动作 |
|------|------|
| `installed: false` | → 走安装流程 |
| `has_wallet: false` | → 走 Onboarding 流程 |
| 全部 true | → 直接执行操作 |

> ⚠️ 注意：免费槽不需要 BNB，`has_bnb` 不再是必须条件。只有付费存储才需要 BNB。

---

## 安装流程（installed: false）

```bash
bash ~/.openclaw/workspace/skills/clawmemory/scripts/install.sh
```

你说：
> "正在帮你安装 ClawMemory，大约需要 30 秒..."

安装完成后继续走 Onboarding 流程。

---

## Onboarding 流程（has_wallet: false，首次使用）

**不要让用户自己敲命令，替他完成。**

### 你说：
> "我来帮你开通链上记忆功能，这是一次性设置，完全免费，大概 30 秒。
> 需要设置一个密码来保护你的记忆钱包，请记住它，以后读取记忆时会用到。"

### 执行：
```bash
bash ~/.openclaw/workspace/skills/clawmemory/scripts/onboarding.sh
```

脚本自动完成：钱包创建 → 环境配置 → 写入初始化标记。

### 成功后你说：
> "✓ 记忆钱包已开通！你现在拥有 10 个永久免费记忆槽，每个可以存约 5000 汉字。
> 现在就来保存点什么吧？"

---

## 保存流程

### 1. 把内容写入临时文件
```bash
cat > /tmp/omp_content.txt << 'EOF'
[要保存的内容]
EOF
```

### 2. 检查大小
```bash
wc -c < /tmp/omp_content.txt
```
- ≤ 10240 字节（10KB）→ 免费存储，继续步骤 3
- > 10240 字节 → 走**超限引导流程**（见下方）

### 3. 选择槽名（根据内容语义判断）

| 槽名 | 适合存什么 |
|------|-----------|
| `core_identity` | 角色设定、性格、偏好 |
| `recent_context` | 最近对话摘要 |
| `user_profile` | 用户个人信息、习惯 |
| `project_<名字>` | 某个项目的上下文 |
| `knowledge_base` | 知识积累 |
| `reminders` | 重要提醒 |
| `shared_notes` | 多 Agent 协作共享 |

### 4. 执行存储
```bash
node ~/.openclaw/workspace/skills/clawmemory/scripts/append-and-save.js \
  --slot "<槽名>" \
  --file /tmp/omp_content.txt \
  --label "<一句话描述内容>"
```

解析输出：
- `status: "ok"` → 告诉用户成功
- `status: "limit"` → 走超限引导流程
- 其他错误 → 走错误处理

### 5. 成功后告诉用户
> "✓ 已永久保存到链上，槽名叫「用户偏好」。不管换什么设备、重启多少次，我都还记得。"

---

## 读取流程

**优先走本地缓存（即时，无需网络）：**

```bash
# Step 1：查本地索引
node -e "
const db = require(process.env.HOME + '/.clawmemory/index.json');
const slots = db.slots || {};
Object.entries(slots).forEach(([name, v]) => {
  const fs = require('fs');
  const localPath = process.env.HOME + '/.clawmemory/slots/' + name + '.md';
  const hasLocal = fs.existsSync(localPath);
  console.log(JSON.stringify({ name, version: v.version, savedAt: v.savedAt, label: v.label, merkleRoot: v.merkleRoot, timestamp: v.timestamp, hasLocal }));
});
"
```

- 本地有缓存（`hasLocal: true`）→ 直接 `cat ~/.clawmemory/slots/<slotname>.md`
- 本地无缓存 → 从 P2P 网络拉取：

```bash
node ~/.clawmemory/memory-client/bin/cli.js load <merkleRoot> /tmp/retrieved.md --timestamp=<timestamp>
cat /tmp/retrieved.md
```

读取后**直接用内容回答用户**，自然体现你记得，例如：
> "你之前提到过喜欢简洁直接的风格，我一直记着呢。"

---

## 列出所有槽

```bash
node -e "
const db = require(process.env.HOME + '/.clawmemory/index.json');
const slots = db.slots || {};
if (!Object.keys(slots).length) { console.log('暂无记忆'); process.exit(0); }
Object.entries(slots).forEach(([name, v]) => {
  console.log(name + ' | v' + v.version + ' | ' + (v.sizeKB||'?') + 'KB | ' + (v.savedAt||'').slice(0,10));
});
"
```

用自然语言回复，例如：
> "你有 3 条记忆：个人偏好、最近的项目笔记、还有上周的对话摘要。想查看哪条？"

---

## 删除槽

```bash
node -e "
const fs = require('fs');
const INDEX = process.env.HOME + '/.clawmemory/index.json';
const db = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
delete db.slots['<槽名>'];
fs.writeFileSync(INDEX, JSON.stringify(db, null, 2));
const slotFile = process.env.HOME + '/.clawmemory/slots/<槽名>.md';
if (fs.existsSync(slotFile)) fs.unlinkSync(slotFile);
console.log('deleted');
"
```

> "好的，已删除「提醒事项」这条记忆。链上数据永久存在，只是我以后不会主动读取它了。"

---

## 授权其他 Agent 读取

```bash
# 拿 merkleRoot
node -e "
const db = require(process.env.HOME + '/.clawmemory/index.json');
const slot = db.slots['<槽名>'];
console.log(slot.merkleRoot, slot.timestamp);
"

# 授权
node ~/.clawmemory/memory-client/bin/cli.js grant <merkleRoot> <对方地址>
```

> "✓ 已授权，对方的 AI 现在可以读取这条记忆了，实现零信息差协作。"

---

## 超过 10KB 时的引导

**不要压缩，不要帮用户删减内容。** 先查剩余槽数：

**有空槽（slots_left > 0）时：**
> "这段内容稍微大了一点（超过了 10KB 的免费额度），有两个方案：
>
> **① 拆分存储**：你还有 {slots_left} 个空槽，我可以把内容分成两部分分别保存，完全免费。
>
> **② 付费存整份**：用少量 $MMP 代币存储完整内容，不限大小。10KB 存一周大约只要 0.007 MMP，非常便宜。
>
> 选哪个？"

**槽已满（slots_left = 0）时：**
> "这段内容超过了免费额度（10KB），而且 10 个记忆槽都已用满。
>
> 可以选择：
> **① 删掉一个不需要的旧槽**腾出空间（链上数据不受影响）
> **② 用少量 $MMP** 存储完整内容，无限大小
>
> 你倾向哪个？"

**用户选付费时：**

先查余额（需要 BNB 支付 gas）：
```bash
bash ~/.openclaw/workspace/skills/clawmemory/scripts/check-status.sh
```

- `has_bnb: false` → 告诉用户需要先充一点 BNB 作为 gas（约 $1-2 足够用很久），再引导购买 $MMP
- `has_bnb: true` 但 MMP 不足 → 告诉用户：
  > "需要先购买一些 $MMP。可以在 PancakeSwap 上购买（合约：`0x30b8Bf35679E024331C813Be4bDfDB784E8E9a1E`），或者运行矿工节点挖矿免费获得。"

---

## 槽满 LRU 自动淘汰

`append-and-save.js` 在槽满时会自动 LRU 淘汰最旧的槽并在输出中返回 `evicted` 字段。告诉用户：
> "记忆槽已满，自动替换掉了最久没更新的「xxx」，帮你保存了新的内容。"

---

## 错误处理

| 情况 | 你说什么 |
|------|---------|
| installed: false | 走安装流程 |
| has_wallet: false | 走 Onboarding 流程 |
| P2P 超时 | "已保存到链上，网络同步稍慢，不影响数据安全。" |
| 槽不存在 | "没找到这条记忆，要我列出所有已保存的吗？" |
| 密码错误 | "密码不对，请确认初始化时设置的密码。" |
| MMP 不足 | 引导 PancakeSwap 购买或挖矿，给出合约地址 |
| BNB 不足（付费操作时）| "需要少量 BNB 作为 gas，向钱包地址转入 0.01 BNB 即可。" |

---

## 合约地址（BSC 主网，永久不变）

| 合约 | 地址 |
|------|------|
| MemoryProtocol Proxy | `0x3BD7945d18FE6B68D273109902616BF17eb40F44` |
| MMPToken | `0x30b8Bf35679E024331C813Be4bDfDB784E8E9a1E` |

## 免费层规则

- 每槽 ≤ 10KB → **免费，永久存储，无需任何代币**
- 每个钱包 ≤ 10 个槽 → **免费**
- 超过 10KB 或 10 个槽 → **需要 $MMP**（付费存储需要少量 BNB 作为 gas）
