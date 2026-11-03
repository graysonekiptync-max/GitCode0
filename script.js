
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
const uploadButton = document.getElementById("uploadButton");
const logoutButton = document.getElementById("logoutButton");
const adminMessage = document.getElementById("adminMessage");

const publishImmediately = document.getElementById("publishImmediately");
const publishingCodeArea = document.getElementById("publishingCodeArea");
const publishCodeInput = document.getElementById("publishCode");

let allFiles = [];
let selectedCategory = "all";
let currentUser = null;
let isAdmin = false;
let loadingFiles = false;

// ==========================================
// HELPERS
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

function showMessage(message, isError = false) {
    adminMessage.textContent = message;
    adminMessage.style.color = isError ? "#ff6262" : "#b58aff";
}

function getFileIcon(filename = "") {
    const name = filename.toLowerCase();

    if (name.endsWith(".pdf")) return "📕";
    if (name.endsWith(".docx")) return "📘";
    if (name.endsWith(".pptx")) return "📊";
    if (/\.(png|jpg|jpeg)$/.test(name)) return "🖼️";

    return "📁";
}

// ==========================================
// PUBLISHING CODE FIELD
// ==========================================

publishImmediately.addEventListener("change", () => {
    publishingCodeArea.hidden = !publishImmediately.checked;

    if (!publishImmediately.checked) {
        publishCodeInput.value = "";
    }
});

// ==========================================
// LOAD FILES
// ==========================================

async function loadFiles() {
    if (loadingFiles) return;

    loadingFiles = true;
    fileGrid.innerHTML = "<p>Loading files...</p>";
    emptyState.hidden = true;

    try {
        let query = supabaseClient
            .from("files")
            .select("*")
            .order("created_at", { ascending: false });

        if (!isAdmin) {
            query = query.eq("is_published", true);
        }

        const { data, error } = await query;

        if (error) {
            console.error("File loading error:", error);
            fileGrid.innerHTML =
                "<p>Couldn't load files. Please refresh the page.</p>";
            return;
        }

        allFiles = data || [];
        renderFiles();

    } finally {
        loadingFiles = false;
    }
}

// ==========================================
// RENDER FILES
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

        const icon = getFileIcon(file.original_filename);
        const title = escapeHTML(file.name);
        const description = escapeHTML(
            file.description || "No description provided."
        );
        const filename = escapeHTML(file.original_filename);
        const downloadUrl = escapeHTML(data.publicUrl);

        const unpublishedLabel =
            isAdmin && !file.is_published
                ? '<span class="unpublished-label">Unpublished</span>'
                : "";

        card.innerHTML = `
            <div class="file-icon">${icon}</div>

            <div class="file-info">
                <h3>${title}</h3>
                <p>${description}</p>
                <span class="file-category">
                    ${escapeHTML(file.category)}
                </span>
                ${unpublishedLabel}
            </div>

            <div class="file-footer">
                <small>${filename}</small>
                <a
                    class="download-button"
                    href="${downloadUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                >Download ↓</a>
            </div>
        `;

        // Unpublished files are visible to admins but not downloadable
        // through the public library interface.
        if (!file.is_published) {
            const downloadLink = card.querySelector(".download-button");
            if (downloadLink) {
                downloadLink.remove();
            }
        }

        fileGrid.appendChild(card);
    });
}

// ==========================================
// SEARCH AND FILTERS
// ==========================================

searchInput.addEventListener("input", renderFiles);

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

// ==========================================
// CHECK ADMIN PERMISSIONS
// ==========================================

async function checkAdmin() {
    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        console.error("Session error:", error);
    }

    currentUser = session?.user || null;
    isAdmin = false;

    if (currentUser) {
        const { data, error: adminError } = await supabaseClient.rpc(
            "is_schooldownloads_admin"
        );

        if (adminError) {
            console.error("Admin check error:", adminError);
        } else {
            isAdmin = data === true;
        }
    }

    loginSection.hidden = isAdmin;
    uploadSection.hidden = !isAdmin;

    adminButton.textContent = isAdmin
        ? "Admin Dashboard"
        : "Admin Login";

    if (currentUser && !isAdmin) {
        showMessage(
            "This account does not have administrator access.",
            true
        );
    }

    await loadFiles();
}

// ==========================================
// ADMIN LOGIN
// ==========================================

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    showMessage("Signing in...");

    const email = document.getElementById("adminEmail").value.trim();
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
    } else {
        showMessage(
            "Signed in, but this account is not an administrator.",
            true
        );
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
    uploadForm.reset();
    publishingCodeArea.hidden = true;

    showMessage("You've signed out.");

    await checkAdmin();
});

// ==========================================
// FILE UPLOAD AND PUBLISHING
// ==========================================

uploadForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isAdmin || !currentUser) {
        showMessage("Administrator access required.", true);
        return;
    }

    const name = document.getElementById("fileName").value.trim();
    const description =
        document.getElementById("fileDescription").value.trim();
    const category = document.getElementById("fileCategory").value;
    const file = document.getElementById("fileInput").files[0];

    const wantsPublishing = publishImmediately.checked;
    const publishingCode = publishCodeInput.value;

    if (!name || !file) {
        showMessage("Please enter a title and choose a file.", true);
        return;
    }

    if (wantsPublishing && !publishingCode.trim()) {
        showMessage("Enter your publishing code first.", true);
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

    // This is a basic consistency check, not a malware scan.
    const allowedMimeTypes = {
        pdf: ["application/pdf"],
        docx: [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        pptx: [
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        ],
        png: ["image/png"],
        jpg: ["image/jpeg"],
        jpeg: ["image/jpeg"]
    };

    if (
        file.type &&
        !allowedMimeTypes[extension].includes(file.type)
    ) {
        showMessage("The file type doesn't match its extension.", true);
        return;
    }

    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";
    showMessage("Uploading your file...");

    let storagePath = null;

    try {
        const safeFilename = file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );

        storagePath = `${crypto.randomUUID()}-${safeFilename}`;

        // Upload the actual file.
        const { error: uploadError } = await supabaseClient.storage
            .from("school-files")
            .upload(storagePath, file, {
                upsert: false,
                contentType: file.type || "application/octet-stream"
            });

        if (uploadError) {
            throw uploadError;
        }

        // Every file starts unpublished.
        const { data: insertedFile, error: databaseError } =
            await supabaseClient
                .from("files")
                .insert({
                    name,
                    description,
                    category,
                    original_filename: file.name,
                    storage_path: storagePath,
                    mime_type: file.type || null,
                    size_bytes: file.size,
                    is_published: false,
                    uploaded_by: currentUser.id
                })
                .select("id")
                .single();

        if (databaseError) {
            throw databaseError;
        }

        // Publish only after Supabase verifies the publishing code.
        if (wantsPublishing) {
            showMessage("Checking publishing code...");

            const { error: publishError } = await supabaseClient.rpc(
                "publish_file",
                {
                    p_file_id: insertedFile.id,
                    p_code: publishingCode
                }
            );

            if (publishError) {
                // The file has uploaded but remains unpublished.
                uploadForm.reset();
                publishingCodeArea.hidden = true;

                showMessage(
                    "File uploaded but NOT published. " +
                    "The publishing code was rejected or publishing failed. " +
                    "You can retry by uploading it again.",
                    true
                );

                await loadFiles();
                return;
            }

            showMessage("File uploaded and published successfully!");
        } else {
            showMessage(
                "File uploaded successfully! It is still unpublished."
            );
        }

        uploadForm.reset();
        publishingCodeArea.hidden = true;

        await loadFiles();

    } catch (error) {
        console.error("Upload error:", error);

        // Remove the stored file if its database record was never created.
        // If a database record exists, leave the file in place.
        if (storagePath) {
            const { data: existingRecord } = await supabaseClient
                .from("files")
                .select("id")
                .eq("storage_path", storagePath)
                .maybeSingle();

            if (!existingRecord) {
                await supabaseClient.storage
                    .from("school-files")
                    .remove([storagePath]);
            }
        }

        showMessage(
            error.message || "Something went wrong during upload.",
            true
        );

    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload File";
    }
});

// ==========================================
// AUTH STATE
// ==========================================

supabaseClient.auth.onAuthStateChange(() => {
    setTimeout(() => {
        checkAdmin();
    }, 0);
});

// ==========================================
// START WEBSITE
// ==========================================

checkAdmin();
