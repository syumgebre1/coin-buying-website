// Read your firebase.js file to check the apiKey
const fs = require('fs');
const path = './src/firebase.js';

if (!fs.existsSync(path)) {
  console.error("❌ Can't find src/firebase.js");
  process.exit(1);
}

const content = fs.readFileSync(path, 'utf8');
const match = content.match(/apiKey:\s*["']([^"']+)["']/);

if (!match) {
  console.log("❌ Can't find apiKey in firebase.js");
} else {
  const key = match[1];
  console.log("🔑 Your current API Key:", key);
  if (key.includes('YOUR_') || key.length < 20) {
    console.log("🚨 ERROR: This looks like a placeholder or invalid key!");
  } else {
    console.log("✅ Key format looks normal (but still might be the wrong project)");
  }
}
