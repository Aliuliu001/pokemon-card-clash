const fs = require('fs');

const html = fs.readFileSync('game.html', 'utf8');

const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;

let styles = [];
let match;
while ((match = styleRegex.exec(html)) !== null) {
    styles.push(match[1]);
}

let scripts = [];
while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[1]);
}

console.log(`Styles found: ${styles.length}`);
styles.forEach((s, i) => console.log(`Style ${i} length: ${s.length}`));

console.log(`Scripts found: ${scripts.length}`);
scripts.forEach((s, i) => console.log(`Script ${i} length: ${s.length}`));

// Write out the largest style and script to files so I can view them later
if (styles.length > 0) {
    const largestStyle = styles.reduce((a, b) => a.length > b.length ? a : b);
    fs.writeFileSync('temp_style.css', largestStyle);
}
if (scripts.length > 0) {
    const largestScript = scripts.reduce((a, b) => a.length > b.length ? a : b);
    fs.writeFileSync('temp_script.js', largestScript);
}
