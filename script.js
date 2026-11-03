
// ==========================================
// SCHOOLDOWNLOADS V2
// Supabase connection
// ==========================================

const SUPABASE_URL = "https://jaaisayqqmljgoxehpzz.supabase.co";

const SUPABASE_KEY = "sb_publishable_VKQv9RLc9Cn9xKTZSskx_A_ywNss51m";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==========================================
// ELEMENTS
// ==========================================

const fileGrid = document.getElementById("fileGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const categoryButtons = document.querySelectorAll(".category-btn");

const adminButton = document.getElementById("adminButton");
const adminPanel = document.getElementById("adminPanel");
const closeAdmin = document.getElementById("closeAdmin");

const loginForm = document.getElementById("loginForm");
const loginSection = document.getElementById("loginSection");
const uploadSection = document.getElementById("uploadSection");

const uploadForm = document.getElementById("uploadForm");
const logoutButton = document.getElementById("logoutButton");
const adminMessage = document.getElementById("adminMessage");

let allFiles = [];
let selectedCategory = "all";
let currentUser = null;
let isAdmin = false;

// ==========================================
// SAFE HTML
// ==========================================

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// ==========================================
// FILE ICONS
// ==========================================

function getFileIcon(file) {
    const name = (file.original_filename || "").toLowerCase();

    if (name.endsWith(".pdf")) return "📕";
    if (name.endsWith(".docx")) return "📘";
    if (name.endsWith(".pptx")) return "📊";
    if (/\.(png|jpg|jpeg)$/.test(name)) return "🖼️";

    return "📁";
}

// ==========================================
// LOAD FILES
// ==========================================

async function loadFiles() {
    fileGrid.innerHTML = "<p>Loading files...</p>";
    emptyState.hidden = true;

    let query = supabaseClient
        .from("files")
        .select("*")
        .order("created_at", { ascending: false });

    // Visitors only see published files.
    // Admins can also see unpublished files.
    if (!isAdmin) {
        query = query.eq("is_published", true);
    }

    const { data, error } = await query;

    if (error) {
        console.error("File loading error:", error);
        fileGrid.innerHTML = "<p>Couldn't load files. Please refresh the page.</p>";
        return;
    }

    allFiles = data || [];
    renderFiles();
}

// ==========================================
// DISPLAY FILES
// ==========================================

function renderFiles() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    const filteredFiles = allFiles.filter(file => {
        const matchesSearch =
            (file.name || "").toLowerCase().includes(searchTerm) ||
            (file.description || "").toLowerCase().includes(searchTerm) ||
            (file.original_filename || "").toLowerCase().includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            file.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    fileGrid.innerHTML = "";

    if (filteredFiles.length === 0) {
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    filteredFiles.forEach(file => {
        const card = document.createElement("article");
        card.className = "file-card";

        const { data } = supabaseClient.storage
            .from("school-files")
            .getPublicUrl(file.storage_path);

        const icon = getFileIcon(file);
        const title = escapeHTML(file.name);
        const description = escapeHTML(file.description || "No description provided.");
        const filename = escapeHTML(file.original_filename);

        card.innerHTML = `
            <div class="file-icon">${icon}</div>

            <div class="file-info">
                <h3>${title}</h3>
                <p>${description}</p>
                <span class="file-category">${escapeHTML(file.category)}</span>
                ${isAdmin && !file.is_published
                    ? '<span class="unpublished-label">Unpublished</span>'
                    : ""}
            </div>

            <div class="file-footer">
                <small>${filename}</small>
                <a
                    class="download-button"
                    href="${escapeHTML(data.publicUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                >Download ↓</a>
            </div>
        `;

        fileGrid.appendChild(card);
    });
}

// ==========================================
// SEARCH
// ==========================================

searchInput.addEventListener("input", renderFiles);

// ==========================================
// CATEGORY FILTERS
// ==========================================

categoryButtons.forEach(button => {
    button.addEventListener("click", () => {
        categoryButtons.forEach(item => item.classList.remove("active"));

        button.classList.add("active");
        selectedCategory = button.dataset.category;

        renderFiles();
    });
});

// ==========================================
// ADMIN PANEL
// ==========================================

function openAdminPanel() {
    adminPanel.hidden = false;
}

function closeAdminPanel() {
    adminPanel.hidden = true;
}

adminButton.addEventListener("click", openAdminPanel);
closeAdmin.addEventListener("click", closeAdminPanel);

function showMessage(message, isError = false) {
    adminMessage.textContent = message;
    adminMessage.style.color = isError ? "#ff6262" : "#a78bfa";
}

// ==========================================
// CHECK ADMIN PERMISSIONS
// ==========================================

async function checkAdmin() {
    const { data: { session } } =
        await supabaseClient.auth.getSession();

    currentUser = session?.user || null;
    isAdmin = false;

    if (currentUser) {
        const { data, error } = await supabaseClient.rpc(
            "is_schooldownloads_admin"
        );

        if (!error && data === true) {
            isAdmin = true;
        }
    }

    loginSection.hidden = isAdmin;
    uploadSection.hidden = !isAdmin;

    adminButton.textContent = isAdmin ? "Admin Dashboard" : "Admin Login";

    if (currentUser && !isAdmin) {
        showMessage("This account does not have administrator access.", true);
    }

    await loadFiles();
}

// ==========================================
// ADMIN LOGIN
// ==========================================

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    showMessage("Signing in...");

    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showMessage(error.message, true);
        return;
    }

    await checkAdmin();

    if (isAdmin) {
        showMessage("Welcome back, administrator!");
    }
});

// ==========================================
// ADMIN LOGOUT
// ==========================================

logoutButton.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        showMessage(error.message, true);
        return;
    }

    currentUser = null;
    isAdmin = false;

    loginForm.reset();
    showMessage("You've signed out.");

    await checkAdmin();
});

// ==========================================
// UPLOAD FILES
// ==========================================

uploadForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isAdmin || !currentUser) {
        showMessage("Administrator access required.", true);
        return;
    }

    const name = document.getElementById("fileName").value.trim();
    const description = document.getElementById("fileDescription").value.trim();
    const category = document.getElementById("fileCategory").value;
    const file = document.getElementById("fileInput").files[0];
    const publish = document.getElementById("publishFile").checked;

    if (!file || !name) {
        showMessage("Please enter a title and select a file.", true);
        return;
    }

    const allowedExtensions = [
        "pdf", "docx", "pptx", "png", "jpg", "jpeg"
    ];

    const extension = file.name.split(".").pop().toLowerCase();

    if (!allowedExtensions.includes(extension)) {
        showMessage("That file type is not allowed.", true);
        return;
    }

    if (file.size > 20 * 1024 * 1024) {
        showMessage("Files must be 20 MB or smaller.", true);
        return;
    }

    const allowedCategories = ["documents", "images", "other"];

    if (!allowedCategories.includes(category)) {
        showMessage("Invalid category.", true);
        return;
    }

    showMessage("Uploading file...");

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${crypto.randomUUID()}-${safeFilename}`;

    // Upload the actual file to Supabase Storage.
    const { error: uploadError } = await supabaseClient.storage
        .from("school-files")
        .upload(storagePath, file, {
            upsert: false,
            contentType: file.type || "application/octet-stream"
        });

    if (uploadError) {
        showMessage(uploadError.message, true);
        return;
    }

    // Save information about the uploaded file.
    const { error: databaseError } = await supabaseClient
        .from("files")
        .insert({
            name,
            description,
            category,
            original_filename: file.name,
            storage_path: storagePath,
            mime_type: file.type || null,
            size_bytes: file.size,
            is_published: publish,
            uploaded_by: currentUser.id
        });

    if (databaseError) {
        // Remove the uploaded file if its database record fails.
        await supabaseClient.storage
            .from("school-files")
            .remove([storagePath]);

        showMessage(databaseError.message, true);
        return;
    }

    uploadForm.reset();

    showMessage("File uploaded successfully!");

    await loadFiles();
});

// ==========================================
// START WEBSITE
// ==========================================

supabaseClient.auth.onAuthStateChange(() => {
    setTimeout(() => checkAdmin(), 0);
});

checkAdmin();
