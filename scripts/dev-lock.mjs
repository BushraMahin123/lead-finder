import fs from "node:fs";
import path from "node:path";

const lockPath = path.join(process.cwd(), ".next", "dev", "lock");

export function readDevLock() {
  if (!fs.existsSync(lockPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(lockPath, "utf8"));
  } catch {
    return null;
  }
}

export function removeDevLock() {
  try {
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch {
    // ignore
  }
}

export function isProcessRunning(pid) {
  if (!pid || Number.isNaN(Number(pid))) return false;

  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return error && typeof error === "object" && "code" in error && error.code === "EPERM";
  }
}
