let _process;
try {
  // eslint-disable-next-line no-eval
  _process = eval("typeof process !== 'undefined' ? process : undefined") || globalThis?.process;
} catch (err) {
  _process = globalThis?.process;
}

import fs from "fs";
import path from "path";
import assert from "assert";

export function detectWaylandFrom({
  env,
  platform,
  readdirSync = (d) => fs.readdirSync(d),
  existsSync = (p) => fs.existsSync(p),
  readFileSync = (p, enc = "utf8") => fs.readFileSync(p, enc),
} = {}) {
  const get = (k) => (env && Object.prototype.hasOwnProperty.call(env, k) ? env[k] : undefined);

  try {
    const isLinux = String(platform || "").toLowerCase() === "linux";

    const waylandDisplay = get("WAYLAND_DISPLAY");
    if (waylandDisplay && String(waylandDisplay).trim() !== "") {
      try {
        const maybePath = String(waylandDisplay);
        if (maybePath.startsWith("/")) {
          if (existsSync(maybePath)) return true;
          return true;
        }
        return true;
      } catch {
        return true;
      }
    }

    const xdgType = get("XDG_SESSION_TYPE");
    if (xdgType && String(xdgType).toLowerCase() === "wayland") {
      return true;
    }

    const desktopCandidates = ["XDG_SESSION_DESKTOP", "DESKTOP_SESSION", "GDMSESSION", "SESSION"];
    for (const key of desktopCandidates) {
      const v = get(key);
      if (v && String(v).toLowerCase().includes("wayland")) {
        return true;
      }
    }

    const xdgRuntimeDir = get("XDG_RUNTIME_DIR");
    if (xdgRuntimeDir && String(xdgRuntimeDir).trim() !== "") {
      try {
        const list = readdirSync(xdgRuntimeDir);
        if (Array.isArray(list)) {
          for (const fname of list) {
            if (String(fname).startsWith("wayland-")) return true;
          }
        }
      } catch {}
    }

    if (isLinux) {
      try {
        const procVerPath = "/proc/version";
        if (existsSync(procVerPath)) {
          const ver = String(readFileSync(procVerPath));
          if (ver.toLowerCase().includes("microsoft")) {
            return false;
          }
        }
      } catch {}
    }

    return false;
  } catch {
    return false;
  }
}

export default function isWayland() {
  const realProcess = _process || { env: {}, platform: "" };
  return detectWaylandFrom({
    env: realProcess.env || {},
    platform: realProcess.platform || "",
    readdirSync: (d) => fs.readdirSync(d),
    existsSync: (p) => fs.existsSync(p),
    readFileSync: (p, enc) => fs.readFileSync(p, enc),
  });
}

if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].endsWith(path.basename(__filename))) {
  console.log("Running simple isWayland sanity tests...");
  assert.strictEqual(
    detectWaylandFrom({ env: { WAYLAND_DISPLAY: "wayland-0" }, platform: "linux", readdirSync: () => [] }),
    true
  );
  assert.strictEqual(
    detectWaylandFrom({ env: { XDG_SESSION_TYPE: "wayland" }, platform: "linux" }),
    true
  );
  const fakeReaddir = () => ["notit", "wayland-1", "foo"];
  assert.strictEqual(
    detectWaylandFrom({ env: { XDG_RUNTIME_DIR: "/tmp/runtime" }, platform: "linux", readdirSync: fakeReaddir }),
    true
  );
  const fakeExists = (p) => p === "/proc/version";
  const fakeReadProc = () => "Linux version 5.x (Microsoft)";
  assert.strictEqual(
    detectWaylandFrom({ env: {}, platform: "linux", existsSync: fakeExists, readFileSync: fakeReadProc }),
    false
  );
  assert.strictEqual(
    detectWaylandFrom({
      env: { WAYLAND_DISPLAY: "wayland-0" },
      platform: "linux",
      existsSync: fakeExists,
      readFileSync: fakeReadProc,
    }),
    true
  );
  assert.strictEqual(
    detectWaylandFrom({ env: {}, platform: "darwin" }),
    false
  );
  console.log("All quick tests passed.");
}

