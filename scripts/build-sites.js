const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const ignored = new Set([".git", ".netlify", "dist", "netlify", "node_modules", "scripts"]);

function titleFrom(html, folder) {
  const match = html.match(/<title[^>]*>\s*([^<]+?)\s*<\/title>/i);
  return match ? match[1].trim() : folder.replace(/[-_]+/g, " ");
}

function assetFrom(html, folder, relPattern) {
  const match = html.match(relPattern);
  if (!match || /^(?:https?:|data:|\/)/i.test(match[1])) return match ? match[1] : null;
  return `/${encodeURIComponent(folder)}/${match[1]}`;
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || ignored.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
fs.copyFileSync(path.join(root, "index.html"), path.join(dist, "index.html"));
for (const name of ["image-b.png", "image-w.png"]) {
  const source = path.join(root, name);
  if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dist, name));
}

const sites = fs.readdirSync(root, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && !entry.name.startsWith(".") && !ignored.has(entry.name))
  .map(entry => {
    const indexPath = path.join(root, entry.name, "index.html");
    if (!fs.existsSync(indexPath)) return null;
    const html = fs.readFileSync(indexPath, "utf8");
    copyDirectory(path.join(root, entry.name), path.join(dist, entry.name));
    return {
      name: titleFrom(html, entry.name),
      path: `/${encodeURIComponent(entry.name)}/`,
      favicon: assetFrom(html, entry.name, /<link\b(?=[^>]*\brel=["'][^"']*\bicon\b[^"']*["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(path.join(dist, "sites.json"), `${JSON.stringify(sites, null, 2)}\n`);
