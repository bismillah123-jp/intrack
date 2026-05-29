const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");

function restore(encodedPath, targetPath) {
  const source = fs.readFileSync(path.join(root, encodedPath), "utf8").replace(/\s+/g, "");
  const output = zlib.gunzipSync(Buffer.from(source, "base64"));
  const target = path.join(root, targetPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output);
}

restore("scripts/main.jsx.gz.b64", "src/main.jsx");
