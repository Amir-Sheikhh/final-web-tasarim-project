import fs from "node:fs";
import { spawnSync } from "node:child_process";

const command = process.argv[2] ?? "help";

function run(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options
  });

  if (result.error?.code === "ENOENT") {
    throw new Error(`${commandName} bulunamadi. Docker Desktop veya Docker Engine kurulu olmali.`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function ensureEnvFile() {
  if (!fs.existsSync(".env") && fs.existsSync(".env.example")) {
    fs.copyFileSync(".env.example", ".env");
    console.log(".env dosyasi .env.example uzerinden olusturuldu.");
  }
}

function ensureDocker() {
  run("docker", ["--version"]);
  run("docker", ["compose", "version"]);
}

function setup() {
  ensureEnvFile();
  ensureDocker();
  run("docker", ["compose", "pull", "neo4j"]);
  console.log("Neo4j Docker servisi hazir. Baslatmak icin: npm run neo4j:start");
}

function start() {
  ensureEnvFile();
  ensureDocker();
  run("docker", ["compose", "up", "-d", "neo4j"]);
  console.log("Neo4j calisiyor: http://localhost:7474 ve bolt://localhost:7687");
}

function stop() {
  ensureDocker();
  run("docker", ["compose", "stop", "neo4j"]);
}

switch (command) {
  case "setup":
    setup();
    break;
  case "start":
    start();
    break;
  case "stop":
    stop();
    break;
  default:
    console.log("Kullanim: node scripts/neo4j-docker.js <setup|start|stop>");
}
