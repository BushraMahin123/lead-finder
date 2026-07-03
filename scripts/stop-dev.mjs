import { execSync } from "node:child_process";
import { isProcessRunning, readDevLock, removeDevLock } from "./dev-lock.mjs";

const lock = readDevLock();

if (lock?.pid && isProcessRunning(lock.pid)) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${lock.pid} /F /T`, { stdio: "ignore" });
    } else {
      process.kill(lock.pid, "SIGTERM");
    }
    console.log(`Stopped dev server (PID ${lock.pid}).`);
  } catch {
    console.log(`Could not stop PID ${lock.pid}. It may already be closed.`);
  }
} else if (lock?.pid) {
  console.log("Removed stale dev server lock.");
}

removeDevLock();
