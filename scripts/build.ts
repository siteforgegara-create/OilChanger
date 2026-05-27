import { spawnSync } from "node:child_process";

if (process.platform === "win32") {
  stopWindowsDevServer(3003);
}

runPnpmExec("prisma", ["generate"]);
runPnpmExec("next", ["build"]);

function runPnpmExec(command: string, args: string[]) {
  const executable = process.platform === "win32" ? "cmd.exe" : "pnpm";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", ["pnpm", "exec", command, ...args].join(" ")]
      : ["exec", command, ...args];
  const result = spawnSync(executable, commandArgs, {
    env: process.env,
    shell: false,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function stopWindowsDevServer(port: number) {
  const command = [
    "$connection = Get-NetTCPConnection -LocalPort",
    String(port),
    "-State Listen -ErrorAction SilentlyContinue | Select-Object -First 1;",
    "if ($connection) {",
    "Write-Host \"Stopping dev server on port",
    String(port),
    "before build...\";",
    "Stop-Process -Id $connection.OwningProcess -Force",
    "}",
  ].join(" ");

  spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    shell: false,
    stdio: "inherit",
  });
}
