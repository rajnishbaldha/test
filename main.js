const { app, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function buildTree(dir) {
  const stats = fs.statSync(dir);
  if (!stats.isDirectory()) return null;

  const tree = {
    name: path.basename(dir),
    path: dir,
    type: 'folder',
    children: []
  };

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const childStats = fs.statSync(fullPath);
    if (childStats.isDirectory()) {
      tree.children.push(buildTree(fullPath));
    } else {
      tree.children.push({
        name: file,
        path: fullPath,
        type: 'file'
      });
    }
  }
  return tree;
}

function buildHTMLTree(node, isRoot = false) {
  if (node.type === 'file') {
    return `<li><a href="${pathToFileURL(node.path).href}" target="_blank">${node.name}</a></li>`;
  } else {
    const openAttr = isRoot ? ' open' : '';
    let str = `<li><details${openAttr}><summary>${node.name}</summary><ul>`;
    for (const child of node.children) {
      str += buildHTMLTree(child);
    }
    str += `</ul></details></li>`;
    return str;
  }
}

function generateHTML(tree) {
  if (!tree) return '<html><body><p>No valid folder selected.</p></body></html>';
  
  return `
    <html>
      <head>
        <title>Folder Tree Viewer</title>
        <style>
          summary { cursor: pointer; font-weight: bold; }
          ul { list-style-type: none; padding-left: 20px; }
          li { margin: 5px 0; }
        </style>
        <script>
          function copyURL() {
            const url = document.location.href;
            navigator.clipboard.writeText(url).then(() => {
              alert('URL copied to clipboard!');
            }).catch(err => {
              alert('Failed to copy: ' + err);
            });
          }
        </script>
      </head>
      <body>
        <h1>Folder Tree</h1>
        <button onclick="copyURL()">Copy Full URL</button>
        <ul>${buildHTMLTree(tree, true)}</ul>
      </body>
    </html>
  `;
}

app.whenReady().then(() => {
  dialog.showOpenDialog({ properties: ['openDirectory'] }).then(result => {
    if (result.canceled) {
      app.quit();
      return;
    }

    const folderPath = result.filePaths[0];
    const tree = buildTree(folderPath);
    const html = generateHTML(tree);
    const htmlPath = path.join(folderPath, '_index.html');

    // Write the HTML file (overwrites if exists)
    fs.writeFileSync(htmlPath, html, 'utf-8');

    // Open in default browser
    const url = pathToFileURL(htmlPath).href;
    shell.openExternal(url).then(() => {
      app.quit();
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
