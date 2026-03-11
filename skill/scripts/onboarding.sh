#!/usr/bin/env bash
# onboarding.sh — ClawMemory 首次使用引导脚本
# AI 检测到 has_wallet: false 时调用，完成一次性初始化。
# 退出码：
#   0 + "ONBOARDING_DONE"  — 成功
#   0 + "ONBOARDING_SKIP"  — 已初始化，跳过
#   1 + "ONBOARDING_FAIL"  — 失败

set -e

CLI_DIR="$HOME/.clawmemory/memory-client"
WALLET_FILE="$HOME/.clawmemory/wallet.enc"
DONE_FLAG="$HOME/.clawmemory/.onboarded"
SKILL_DIR="$(dirname "$0")"

# ── 已初始化，直接跳过 ────────────────────────────────────────────────────
if [ -f "$DONE_FLAG" ] && [ -f "$WALLET_FILE" ]; then
  echo "ONBOARDING_SKIP"
  exit 0
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       ClawMemory — 链上记忆初始化向导                ║"
echo "║       完全免费 · 一次性操作 · 约30秒完成             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: 检查 CLI 是否安装 ─────────────────────────────────────────────
echo "[1/3] 检查环境..."
if [ ! -f "$CLI_DIR/bin/cli.js" ] || [ ! -d "$CLI_DIR/node_modules" ]; then
  echo "  → 正在安装 ClawMemory CLI..."
  bash "$SKILL_DIR/install.sh"
  if [ ! -f "$CLI_DIR/bin/cli.js" ]; then
    echo "ONBOARDING_FAIL:CLI install failed"
    exit 1
  fi
fi
echo "  ✓ CLI 就绪"

# ── Step 2: 写入 .env ─────────────────────────────────────────────────────
echo "[2/3] 配置网络..."
ENV_FILE="$CLI_DIR/.env"
if [ ! -f "$ENV_FILE" ]; then
  mkdir -p "$CLI_DIR"
  cat > "$ENV_FILE" << 'EOF'
PROTOCOL_ADDRESS=0x3BD7945d18FE6B68D273109902616BF17eb40F44
MMP_TOKEN_ADDRESS=0x30b8Bf35679E024331C813Be4bDfDB784E8E9a1E
BSC_RPC=https://bsc-dataseed.binance.org/
EOF
fi
echo "  ✓ 网络配置完成（BSC 主网）"

# ── Step 3: 创建钱包 ──────────────────────────────────────────────────────
echo "[3/3] 创建记忆钱包..."
echo ""
echo "  请设置一个密码来保护你的记忆钱包。"
echo "  ⚠️  这个密码只存在本地，请务必记住，丢失后无法恢复。"
echo ""

if [ -f "$WALLET_FILE" ]; then
  echo "  → 检测到已有钱包，跳过创建"
else
  WALLET_PASSWORD="${WALLET_PASSWORD:-clawmemory_default_$(openssl rand -hex 8)}"
  export WALLET_PASSWORD
  RESULT=$(node "$SKILL_DIR/init-wallet.js" 2>&1)
  if [ $? -ne 0 ]; then
    echo ""
    echo "ONBOARDING_FAIL:wallet creation failed: $RESULT"
    exit 1
  fi
  WALLET_ADDR=$(echo "$RESULT" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).address)}catch(e){}})")
  WALLET_PK=$(echo "$RESULT" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).privateKey)}catch(e){}})")
  echo ""
  echo "  ✓ 钱包已创建"
  echo "  地址: $WALLET_ADDR"
  echo ""
  echo "  ⚠️  私钥（只显示一次，请立即保存）："
  echo "  $WALLET_PK"
  echo ""

  # 把地址写入 index.json
  INDEX="$HOME/.clawmemory/index.json"
  mkdir -p "$HOME/.clawmemory/slots"
  if [ ! -f "$INDEX" ]; then
    echo '{"slots":{},"files":[]}' > "$INDEX"
  fi
  node -e "
    const fs = require('fs');
    const db = JSON.parse(fs.readFileSync('$INDEX','utf8'));
    db.wallet_address = '$WALLET_ADDR';
    fs.writeFileSync('$INDEX', JSON.stringify(db, null, 2));
  " 2>/dev/null
fi

# ── 初始化本地索引 ────────────────────────────────────────────────────────
mkdir -p "$HOME/.clawmemory/slots"
INDEX="$HOME/.clawmemory/index.json"
if [ ! -f "$INDEX" ]; then
  echo '{"slots":{},"files":[]}' > "$INDEX"
fi

# ── 写入完成标记 ──────────────────────────────────────────────────────────
mkdir -p "$HOME/.clawmemory"
touch "$DONE_FLAG"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✓ 初始化完成！链上记忆功能已开通。                 ║"
echo "║                                                      ║"
echo "║  • 免费槽：10个，每个 ≤10KB，永久存储               ║"
echo "║  • 无需 BNB，无需 \$MMP，完全免费                   ║"
echo "║  • 付费扩展：需少量 \$MMP（>10KB 或 >10 槽）        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "ONBOARDING_DONE"
