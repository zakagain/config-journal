import fs from 'fs';
import path from 'path';

const title = process.argv[2];

if (!title) {
  console.log('Error: Please provide an app/tool name in quotes.');
  process.exit(1);
}

const fileName = title.toLowerCase().trim().replace(/\s+/g, '-') + '.md';
const filePath = path.join('docs', 'apps', fileName);

const template = `---
title: ${title}
date: ${new Date().toISOString().split('T')[0]}
editLink: true
---

# ${title}

> "[Insert your opening hook here.]"



### 📋 The Vitals
- **Category:** [Browser / Editor / Utility / Productivity / etc.]
- **Platform:** [macOS / Windows / Linux / Web / Cross-platform]
- **Pricing:** [Free / Freemium / Paid / Subscription]
- **My Rating:** [/10]
- **Replaces:** [What it replaced, if anything]



### ✅ What It Does Well
[The standout features. What makes this worth using?]



### ❌ What It Doesn't
[The pain points, quirks, or missing features. Be honest.]



### 🔁 What It Replaced
[Did you switch from something else? Why?]



### 🏁 Final Verdict
[Is it a keeper or a temporary fling?]



### 🔚 The End
Hope you enjoyed it, make sure to check out my other reviews, and see you on the next one!
`;

if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, template);
  console.log(`🚀 Created new app review: ${filePath}`);
} else {
  console.log('⚠️ That file already exists. Stop overthinking and just edit it.');
}
