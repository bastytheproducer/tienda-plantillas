const fs = require("fs");
const path = require("path");

const defaultContent = require("../data/site-content.json");

function getSiteContentFilePath() {
  return path.join(__dirname, "..", "data", "site-content.json");
}

function readSiteContent() {
  try {
    const filePath = getSiteContentFilePath();
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return defaultContent;
  }
}

function saveSiteContent(content) {
  const next = { ...defaultContent, ...content };
  const filePath = getSiteContentFilePath();
  const normalized = JSON.stringify(next, null, 2) + "\n";
  fs.writeFileSync(filePath, normalized, "utf8");
  return next;
}

module.exports = {
  readSiteContent,
  saveSiteContent,
  defaultContent,
};
