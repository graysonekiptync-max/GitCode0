const $ = (id) => document.getElementById(id);

const defaultFiles = {
  "index.html": `<!DOCTYPE html>
<html>
<head>
  <title>My GitCode Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello, GitCode!</h1>
  <p>Edit this file and click Run to preview it.</p>
  <button onclick="sayHello()">Click me</button>
  <script src="script.js"><\/script>
</body>
</html>`,

  "style.css": `body {
  font-family: Arial, sans-serif;
  background: #f4f4f4;
  padding: 40px;
}

h1 {
  color: #7258e8;
}`,

  "script.js": `function sayHello() {
  alert("Hello from GitCode!");
}

console.log("JavaScript is working!");`,

  "main.py": `print("Hello from GitCode!")

name = "Developer"
print(f"Welcome, {name}!")`
};

let files = {};
let openFiles = [];
let activeFile = "index.html";
let editor;
let pyodide = null;
let pyodideLoading = false;

function loadProject() {
  try {
    const saved = localStorage.getItem("gitcode-project");
    files = saved ? JSON.parse(saved) : { ...defaultFiles };
  } catch {
    files = { ...defaultFiles };
  }

  openFiles = ["index.html"];
  activeFile = "index.html";
}

function saveProject() {
  files[activeFile] = editor.getValue();
  localStorage.setItem("gitcode-project", JSON.stringify(files));
  setStatus("Project saved");
}

function setStatus(message) {
  $("statusMessage").textContent = message;
}

function getExtension(filename) {
  return filename.split(".").pop().toLowerCase();
}

function getMode(filename) {
  const ext = getExtension(filename);

  if (ext === "html" || ext === "htm") return "htmlmixed";
  if (ext === "css") return "css";
  if (ext === "js" || ext === "mjs") return "javascript";
  if (ext === "py") return "python";

  return "text";
}

function getFileIcon(filename) {
  const ext = getExtension(filename);

  const icons = {
    html: "🌐",
    htm: "🌐",
    css: "🎨",
    js: "📜",
    mjs: "📜",
    py: "🐍",
    json: "📋",
    txt: "📄",
    md: "📝"
  };

  return icons[ext] || "📄";
}

function renderFileTree() {
  const tree = $("fileTree");
  tree.innerHTML = "";

  Object.keys(files).sort().forEach(filename => {
    const item = document.createElement("div");
    item.className = "file-item";

    if (filename === activeFile) {
      item.classList.add("active");
    }

    const icon = document.createElement("span");
    icon.className = "file-icon";
    icon.textContent = getFileIcon(filename);

    const label = document.createElement("span");
    label.textContent = filename;

    item.append(icon, label);

    item.onclick = () => openFile(filename);

    tree.appendChild(item);
  });
}

function renderTabs() {
  const tabs = $("tabs");
  tabs.innerHTML = "";

  openFiles.forEach(filename => {
    const tab = document.createElement("div");
    tab.className = "tab";

    if (filename === activeFile) {
      tab.classList.add("active");
    }

    const icon = document.createElement("span");
    icon.textContent = getFileIcon(filename);

    const label = document.createElement("span");
    label.textContent = filename;

    const close = document.createElement("span");
    close.className = "tab-close";
    close.textContent = "×";

    close.onclick = event => {
      event.stopPropagation();
      closeFile(filename);
    };

    tab.append(icon, label, close);
    tab.onclick = () => openFile(filename);

    tabs.appendChild(tab);
  });
}

function openFile(filename) {
  if (!Object.prototype.hasOwnProperty.call(files, filename)) return;

  files[activeFile] = editor.getValue();

  activeFile = filename;

  if (!openFiles.includes(filename)) {
    openFiles.push(filename);
  }

  editor.setOption("mode", getMode(filename));
  editor.setValue(files[filename]);
  editor.clearHistory();

  $("currentFile").textContent = filename;
  $("breadcrumbs").textContent = filename;
  $("languageLabel").textContent = getExtension(filename).toUpperCase();

  renderTabs();
  renderFileTree();
  editor.refresh();
}

function closeFile(filename) {
  if (filename === activeFile) {
    files[activeFile] = editor.getValue();
  }

  openFiles = openFiles.filter(name => name !== filename);

  if (openFiles.length === 0) {
    openFiles.push("index.html");
  }

  if (activeFile === filename) {
    activeFile = openFiles[0];
    editor.setOption("mode", getMode(activeFile));
    editor.setValue(files[activeFile] || "");
    $("currentFile").textContent = activeFile;
    $("breadcrumbs").textContent = activeFile;
    $("languageLabel").textContent = getExtension(activeFile).toUpperCase();
  }

  renderTabs();
  renderFileTree();
}

function createFile() {
  const filename = prompt("Enter a filename (example: app.js):");

  if (!filename) return;

  if (files[filename]) {
    alert("That file already exists.");
    return;
  }

  files[filename] = "";
  openFile(filename);
  saveProject();
}

function createFolder() {
  alert(
    "Folder creation is not available in this starter version. " +
    "Files are stored in a flat project workspace."
  );
}

function showPanel(name) {
  $("bottomPanel").classList.remove("closed");

  document.querySelectorAll(".panel-content").forEach(panel => {
    panel.classList.add("hidden");
  });

  $(name).classList.remove("hidden");

  document.querySelectorAll(".panel-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.panel === name);
  });
}

function writeOutput(message, type = "") {
  const line = document.createElement("div");
  line.className = "output-line " + type;
  line.textContent = message;
  $("output").appendChild(line);
}

function clearOutput() {
  $("output").innerHTML = "";
}

function runJavaScript(code) {
  clearOutput();
  showPanel("output");

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    writeOutput(args.map(String).join(" "));
    originalLog(...args);
  };

  console.error = (...args) => {
    writeOutput(args.map(String).join(" "), "error");
    originalError(...args);
  };

  console.warn = (...args) => {
    writeOutput(args.map(String).join(" "), "error");
    originalWarn(...args);
  };

  try {
    const result = new Function(code)();

    if (result !== undefined) {
      writeOutput(String(result), "success");
    }

    setStatus("JavaScript executed");
  } catch (error) {
    writeOutput(error.stack || error.message, "error");
    setStatus("Execution failed");
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

function runHTML() {
  const html = files["index.html"] || editor.getValue();
  const css = files["style.css"] || "";
  const js = files["script.js"] || "";

  const combined = html
    .replace(
      '<link rel="stylesheet" href="style.css">',
      `<style>${css}</style>`
    )
    .replace(
      '<script src="script.js"><\/script>',
      `<script>${js}<\/script>`
    );

  $("previewFrame").srcdoc = combined;
  showPanel("preview");
  setStatus("Preview updated");
}

async function loadPyodideRuntime() {
  if (pyodide) return pyodide;

  if (pyodideLoading) {
    while (!pyodide) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return pyodide;
  }

  pyodideLoading = true;
  setStatus("Loading Python runtime...");

  try {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";

    document.head.appendChild(script);

    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
    });

    pyodide = await loadPyodide();

    return pyodide;
  } finally {
    pyodideLoading = false;
  }
}

async function runPython(code) {
  clearOutput();
  showPanel("output");

  try {
    const runtime = await loadPyodideRuntime();

    runtime.setStdout({
      batched: message => writeOutput(message)
    });

    runtime.setStderr({
      batched: message => writeOutput(message, "error")
    });

    await runtime.runPythonAsync(code);

    setStatus("Python executed");
  } catch (error) {
    writeOutput(error.message || String(error), "error");
    setStatus("Python execution failed");
  }
}

async function runCode() {
  files[activeFile] = editor.getValue();

  const extension = getExtension(activeFile);

  if (["html", "htm"].includes(extension)) {
    runHTML();
  } else if (["js", "mjs"].includes(extension)) {
    runJavaScript(editor.getValue());
  } else if (extension === "py") {
    await runPython(editor.getValue());
  } else if (extension === "css") {
    files["style.css"] = editor.getValue();
    runHTML();
  } else {
    clearOutput();
    showPanel("output");
    writeOutput(`No runner available for .${extension} files.`, "error");
  }
}

// Initialize IDE
loadProject();

editor = CodeMirror($("editorHost"), {
  value: files[activeFile],
  mode: getMode(activeFile),
  theme: "material-darker",
  lineNumbers: true,
  indentUnit: 2,
  tabSize: 2,
  lineWrapping: false,
  autofocus: true
});

editor.on("change", () => {
  files[activeFile] = editor.getValue();
  setStatus("Unsaved changes");
});

$("saveBtn").onclick = saveProject;
$("runBtn").onclick = runCode;
$("newFileBtn").onclick = createFile;
$("newFolderBtn").onclick = createFolder;

$("previewBtn").onclick = runHTML;

$("terminalBtn").onclick = () => showPanel("terminal");

$("closePanel").onclick = () => {
  $("bottomPanel").classList.add("closed");
};

document.querySelectorAll(".panel-tab").forEach(tab => {
  tab.onclick = () => showPanel(tab.dataset.panel);
});

$("searchToggle").onclick = () => {
  const query = prompt("Search in the current file:");

  if (!query) return;

  const content = editor.getValue();
  const index = content.indexOf(query);

  if (index === -1) {
    alert("Text not found.");
    return;
  }

  editor.focus();
  editor.setSelection(
    editor.posFromIndex(index),
    editor.posFromIndex(index + query.length)
  );
};

renderFileTree();
renderTabs();
setStatus("Ready");
