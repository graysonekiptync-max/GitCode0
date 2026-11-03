
/* =====================================
   SCHOOLDOWNLOADS - WEBSITE ENGINE
   ===================================== */

// FILE DATABASE
// Replace these example entries with your own files.

const files = [
    {
        name: "Mathematics Notes",
        description: "Example mathematics study notes and revision material.",
        category: "documents",
        type: "PDF",
        size: "2.4 MB",
        icon: "📐",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    },
    {
        name: "Science Resources",
        description: "Example science learning resources.",
        category: "documents",
        type: "PDF",
        size: "1.8 MB",
        icon: "🧪",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    },
    {
        name: "School Wallpaper",
        description: "A sample image download.",
        category: "images",
        type: "IMAGE",
        size: "Demo",
        icon: "🖼️",
        url: "https://placehold.co/800x500/png"
    },
    {
        name: "English Study Guide",
        description: "Example English study and revision guide.",
        category: "documents",
        type: "PDF",
        size: "1.2 MB",
        icon: "📚",
        url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    },
    {
        name: "Presentation Template",
        description: "A sample presentation resource.",
        category: "other",
        type: "FILE",
        size: "Demo",
        icon: "📊",
        url: "https://example.com/"
    },
    {
        name: "Study Background",
        description: "Another sample image resource.",
        category: "images",
        type: "IMAGE",
        size: "Demo",
        icon: "🎨",
        url: "https://placehold.co/800x500/png"
    }
];

// ELEMENTS

const fileGrid = document.getElementById("fileGrid");
const searchInput = document.getElementById("searchInput");
const emptyState = document.getElementById("emptyState");
const categoryButtons = document.querySelectorAll(".category");

let activeCategory = "all";
let searchTerm = "";

// RENDER FILES

function renderFiles() {
    const filteredFiles = files.filter(file => {
        const matchesCategory =
            activeCategory === "all" ||
            file.category === activeCategory;

        const matchesSearch =
            file.name.toLowerCase().includes(searchTerm) ||
            file.description.toLowerCase().includes(searchTerm) ||
            file.type.toLowerCase().includes(searchTerm);

        return matchesCategory && matchesSearch;
    });

    fileGrid.innerHTML = "";

    emptyState.hidden = filteredFiles.length !== 0;

    filteredFiles.forEach((file, index) => {
        const card = document.createElement("article");
        card.className = "file-card";
        card.style.animationDelay = `${index * 70}ms`;

        const icon = document.createElement("div");
        icon.className = "file-icon";
        icon.textContent = file.icon;

        const title = document.createElement("h3");
        title.textContent = file.name;

        const description = document.createElement("p");
        description.textContent = file.description;

        const meta = document.createElement("div");
        meta.className = "file-meta";

        const fileInfo = document.createElement("span");
        fileInfo.textContent = `${file.type} · ${file.size}`;

        const download = document.createElement("a");
        download.className = "download-link";
        download.href = file.url;
        download.target = "_blank";
        download.rel = "noopener noreferrer";
        download.textContent = "Download ↗";
        download.setAttribute(
            "aria-label",
            `Download ${file.name}`
        );

        meta.append(fileInfo, download);
        card.append(icon, title, description, meta);

        fileGrid.appendChild(card);
    });
}

// SEARCH

searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.toLowerCase().trim();
    renderFiles();
});

// CATEGORY FILTERING

categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
        categoryButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        activeCategory = button.dataset.category;
        renderFiles();
    });
});

// INITIALISE WEBSITE

renderFiles();

console.log("SchoolDownloads successfully loaded!");
