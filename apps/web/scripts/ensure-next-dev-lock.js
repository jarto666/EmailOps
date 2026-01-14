const fs = require("fs");
const path = require("path");

function pidIsRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means it exists but we can't signal it; treat as running.
    if (err && typeof err === "object" && err.code === "EPERM") return true;
    return false;
  }
}

function main() {
  const lockPath = path.join(process.cwd(), ".next", "dev", "lock");
  if (!fs.existsSync(lockPath)) return;

  let contents = "";
  try {
    contents = fs.readFileSync(lockPath, "utf8").trim();
  } catch {
    // If we can't read it, don't risk deleting a real lock.
    console.error(
      `[web] Found Next dev lock at ${lockPath} but could not read it. If you're sure no other 'next dev' is running, delete it manually.`
    );
    process.exit(1);
  }

  // Next's lock format can vary; best-effort parse first integer as PID.
  const maybePid = Number.parseInt(
    String(contents).match(/\d+/)?.[0] ?? "",
    10
  );
  if (pidIsRunning(maybePid)) {
    console.error(
      `[web] Another 'next dev' appears to be running (pid=${maybePid}). Stop it, then re-run.`
    );
    process.exit(1);
  }

  try {
    fs.rmSync(lockPath, { force: true });
    console.warn(`[web] Removed stale Next dev lock at ${lockPath}.`);
  } catch (err) {
    console.error(
      `[web] Found stale Next dev lock at ${lockPath} but could not remove it: ${
        err && typeof err === "object" && err.message
          ? err.message
          : String(err)
      }`
    );
    process.exit(1);
  }
}

main();
