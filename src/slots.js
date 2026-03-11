"use strict";
/**
 * slots.js — Named Slot Manager (Skill layer, no contract changes)
 *
 * 每个钱包地址独立维护一份 ~/.clawmemory/slots/<address>.json
 * 格式：
 * {
 *   "core_identity": { "root": "0x...", "timestamp": 1234567890, "savedAt": 1710000000000 },
 *   ...
 * }
 * 最多 FREE_SLOTS = 10 个槽，满时 LRU 淘汰最旧（savedAt 最小）的槽。
 */

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const FREE_SLOTS = 10;

function getSlotsPath(address) {
  const dir = path.join(os.homedir(), ".clawmemory", "slots");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, address.toLowerCase() + ".json");
}

function loadSlots(address) {
  const p = getSlotsPath(address);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return {}; }
}

function saveSlots(address, slots) {
  fs.writeFileSync(getSlotsPath(address), JSON.stringify(slots, null, 2));
}

/**
 * 写入命名槽。如果超过 FREE_SLOTS，LRU 淘汰最旧的槽。
 * @returns {{ evicted: string|null }} 被淘汰的槽名，若无则 null
 */
function setSlot(address, slotName, root, timestamp) {
  const slots = loadSlots(address);
  let evicted = null;

  // 已有同名槽直接覆盖，不占新位置
  const isNew = !slots[slotName];

  if (isNew && Object.keys(slots).length >= FREE_SLOTS) {
    // LRU：找 savedAt 最小的槽淘汰
    const oldest = Object.entries(slots)
      .sort((a, b) => a[1].savedAt - b[1].savedAt)[0];
    evicted = oldest[0];
    delete slots[evicted];
  }

  slots[slotName] = { root, timestamp, savedAt: Date.now() };
  saveSlots(address, slots);
  return { evicted };
}

/**
 * 读取某个命名槽
 * @returns {{ root, timestamp, savedAt } | null}
 */
function getSlot(address, slotName) {
  const slots = loadSlots(address);
  return slots[slotName] || null;
}

/**
 * 删除某个命名槽（本地，不影响链上）
 */
function deleteSlot(address, slotName) {
  const slots = loadSlots(address);
  if (!slots[slotName]) return false;
  delete slots[slotName];
  saveSlots(address, slots);
  return true;
}

/**
 * 列出所有槽，按 savedAt 倒序（最新在前）
 */
function listSlots(address) {
  const slots = loadSlots(address);
  return Object.entries(slots)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * 查询已用槽数
 */
function getSlotCount(address) {
  return Object.keys(loadSlots(address)).length;
}

module.exports = { setSlot, getSlot, deleteSlot, listSlots, getSlotCount, FREE_SLOTS };
