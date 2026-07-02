const fs = require("fs");
const path = require("path");

const maxBytes = 2 * 1024 * 1024;
const bundlePath = path.join(
  process.cwd(),
  "data",
  "seed",
  "offline-bundle.json"
);

const size = fs.statSync(bundlePath).size;
if (size > maxBytes) {
  const sizeMb = (size / (1024 * 1024)).toFixed(2);
  throw new Error(
    `Offline bundle too large: ${sizeMb}MB (max 2.00MB). Reduce data in data/seed/offline-bundle.json.`
  );
}

console.log(
  `Offline bundle size OK: ${(size / 1024).toFixed(1)}KB / 2048.0KB max`
);
