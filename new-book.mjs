import fs from 'fs';
import path from 'path';

const title = process.argv[2];

if (!title) {
  console.log('Error: Please provide a book title in quotes.');
  process.exit(1);
}

// Convert "The Hobbit" to "the-hobbit.md"
const fileName = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[\/\\:*?"<>|]/g, '') + '.md';
const filePath = path.join('docs', 'books', fileName);

const template = `---
title: ${title}
date: ${new Date().toISOString().split('T')[0]}
editLink: true
---

# ${title} | Review

> "[Insert your opening hook here.]"



### 📋 The Vitals
- **Author:** [Author name]
- **Genre:** [Genre]
- **Pages:** [X]
- **Format:** [Paperback / Hardcover / Kindle / Audiobook]
- **My Rating:** [/10]
- **Verdict:** [One-line take]



### 📖 Summary
[A brief, spoiler-free overview of what the book is about.]



### 💭 Themes & Ideas
[What the book is really about — the big questions, the messages, the ideas that stick with you.]



### ✍️ Writing Style
[Prose, pacing, structure, dialogue, and how the author tells the story.]



### 👍 What Worked
[What stood out — characters, plot twists, worldbuilding, emotional beats, etc.]



### 👎 What Didn't
[Weak points — slow sections, underdeveloped characters, clunky dialogue, etc.]



### 🏁 Final Verdict
[Who should read this, and is it worth your time?]



### 🔚 The End
I hope you enjoyed it, make sure to check out my other reviews, and see you on the next one!
`;

if (!fs.existsSync(filePath)) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, template);
  console.log(`📖 Created new book review: ${filePath}`);
} else {
  console.log('⚠️ That file already exists. Stop overthinking and just edit it.');
}
