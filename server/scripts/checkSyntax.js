const { execFileSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..")
const ignored = new Set(["node_modules", "coverage"])

const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) visit(fullPath)
    else if (entry.name.endsWith(".js")) {
      execFileSync(process.execPath, ["--check", fullPath], { stdio: "inherit" })
    }
  }
}

visit(root)
console.log("Server JavaScript syntax check passed.")
