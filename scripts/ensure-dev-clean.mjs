import { isProcessRunning, readDevLock, removeDevLock } from "./dev-lock.mjs";

const lock = readDevLock();
if (!lock) process.exit(0);

if (!isProcessRunning(lock.pid)) {
  removeDevLock();
}
