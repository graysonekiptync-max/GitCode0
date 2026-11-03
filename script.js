// ============================================
// SCHOOL DOWNLOADS - SUPABASE CONFIGURATION
// ============================================

const SUPABASE_URL = "https://jaaisayqqmljgoxehpzz.supabase.co";
const SUPABASE_KEY = "sb_publishable_VKQv9RLc9Cn9xKTZSskx_A_ywNss51m";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const BUCKET_NAME = "school-files";
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
    "pdf",
    "docx",
    "pptx",
    "png",
    "jpg",
    "jpeg"
];

let currentUser = null;
let isAdmin = false;
let allFiles = [];
let selectedCategory = "all";


// ============================================
// ELEMENTS
// ============================================

const fileGrid = document.getElementById("fileGrid");
const searchInput = document.getElementById("searchInput");

const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

const adminPanel = document.getElementById("adminPanel");
const adminLoginButton = document.getElementById("adminLoginButton");
const adminLogoutButton = document.getElementById("adminLogoutButton");

const uploadForm = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");
const uploadButton = document.getElementById("uploadButton");

const pendingFiles = document.getElementById("pendingFiles");


// ============================================
// HELPERS
// ============================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function showMessage(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle("error", isError);
}

function getExtension(filename) {
    return filename.split(".").pop().toLowerCase();
}

function formatFileSize(bytes) {
    if (!bytes) return "Unknown size";

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


// ============================================
// LOAD PUBLIC FILES
// ============================================

async function loadFiles() {
    fileGrid.innerHTML = "<p>Loading files...</p>";

    const { data, error } = await supabaseClient
        .from("files")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        fileGrid.innerHTML = "<p>Couldn't load files. Please try again.</p>";
        return;
    }

    allFiles = data || [];
    displayFiles();
}

function displayFiles() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredFiles = allFiles.filter(file => {
        const matchesSearch =
            file.name.toLowerCase().includes(searchTerm) ||
            (file.description || "").toLowerCase().includes(searchTerm);

        const matchesCategory =
            selectedCategory === "all" ||
            file.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    if (filteredFiles.length === 0) {
        fileGrid.innerHTML = "<p>No files found.</p>";
        return;
    }

    fileGrid.innerHTML = filteredFiles.map(file => {
        const { data } = supabaseClient.storage
            .from(BUCKET_NAME)
            .getPublicUrl(file.storage_path);

        return `
            <article class="file-card">
                <div class="file-icon">📄</div>
                <h3>${escapeHTML(file.name)}</h3>
                <p>${escapeHTML(file.description || "No description provided.")}</p>
                <span class="file-category">${escapeHTML(file.category)}</span>
                <span class="file-size">${formatFileSize(file.size_bytes)}</span>
                <a
                    class="button"
                    href="${escapeHTML(data.publicUrl)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                >Download</a>
            </article>
        `;
    }).join("");
}


// ============================================
// SEARCH AND CATEGORIES
// ============================================

searchInput.addEventListener("input", displayFiles);

document.querySelectorAll(".category").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".category").forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");
        selectedCategory = button.dataset.category;
        displayFiles();
    });
});


// ============================================
// ADMIN LOGIN MODAL
// ============================================

adminLoginButton.addEventListener("click", () => {
    loginModal.hidden = false;
});

document.getElementById("closeLoginModal").addEventListener("click", () => {
    loginModal.hidden = true;
});

loginModal.addEventListener("click", event => {
    if (event.target === loginModal) {
        loginModal.hidden = true;
    }
});


// ============================================
// CHECK ADMIN PERMISSIONS
// ============================================

async function checkAdmin() {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    currentUser = sessionData.session?.user || null;

    if (!currentUser) {
        isAdmin = false;
        updateAdminInterface();
        return;
    }

    const { data, error } = await supabaseClient.rpc(
        "is_schooldownloads_admin"
    );

    if (error || data !== true) {
        isAdmin = false;
        await supabaseClient.auth.signOut();
        currentUser = null;
    } else {
        isAdmin = true;
    }

    updateAdminInterface();

    if (isAdmin) {
        await loadPendingFiles();
    }
}

function updateAdminInterface() {
    adminPanel.hidden = !isAdmin;
    adminLoginButton.hidden = isAdmin;
    adminLogoutButton.hidden = !isAdmin;
}


// ============================================
// LOGIN
// ============================================

loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    showMessage(loginMessage, "Signing in...");

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        showMessage(loginMessage, error.message, true);
        return;
    }

    await checkAdmin();

    if (!isAdmin) {
        showMessage(loginMessage, "This account is not an administrator.", true);
        return;
    }

    loginModal.hidden = true;
    loginForm.reset();
    showMessage(loginMessage, "");
    await loadPendingFiles();
});


// ============================================
// LOGOUT
// ============================================

adminLogoutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();

    currentUser = null;
    isAdmin = false;

    updateAdminInterface();
    pendingFiles.innerHTML = "";

    alert("You have been logged out.");
});


// ============================================
// UPLOAD FILE
// ============================================

uploadForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!isAdmin || !currentUser) {
        showMessage(uploadMessage, "Administrator login required.", true);
        return;
    }

    const name = document.getElementById("fileName").value.trim();
    const description = document.getElementById("fileDescription").value.trim();
    const category = document.getElementById("fileCategory").value;
    const file = document.getElementById("fileUpload").files[0];

    if (!file) {
        showMessage(uploadMessage, "Please select a file.", true);
        return;
    }

    const extension = getExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        showMessage(uploadMessage, "That file type is not allowed.", true);
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        showMessage(uploadMessage, "Files must be smaller than 20 MB.", true);
        return;
    }

    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";
    showMessage(uploadMessage, "Uploading your file...");

    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${crypto.randomUUID()}-${safeFilename}`;

    const { error: storageError } = await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
            contentType: file.type || "application/octet-stream",
            upsert: false
        });

    if (storageError) {
        showMessage(uploadMessage, storageError.message, true);
        resetUploadButton();
        return;
    }

    const { error: databaseError } = await supabaseClient
        .from("files")
        .insert({
            name,
            description,
            category,
            original_filename: file.name,
            storage_path: storagePath,
            mime_type: file.type,
            size_bytes: file.size,
            is_published: false,
            uploaded_by: currentUser.id
        });

    if (databaseError) {
        console.error(databaseError);

        await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .remove([storagePath]);

        showMessage(uploadMessage, databaseError.message, true);
        resetUploadButton();
        return;
    }

    uploadForm.reset();
    showMessage(uploadMessage, "Upload successful! Your file is waiting to be published.");
    resetUploadButton();

    await loadPendingFiles();
});

function resetUploadButton() {
    uploadButton.disabled = false;
    uploadButton.textContent = "Upload File";
}


// ============================================
// LOAD UNPUBLISHED FILES
// ============================================

async function loadPendingFiles() {
    if (!isAdmin) return;

    pendingFiles.innerHTML = "<p>Loading...</p>";

    const { data, error } = await supabaseClient
        .from("files")
        .select("*")
        .eq("is_published", false)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        pendingFiles.innerHTML = "<p>Couldn't load unpublished files.</p>";
        return;
    }

    if (!data || data.length === 0) {
        pendingFiles.innerHTML = "<p>No files waiting to be published.</p>";
        return;
    }

    pendingFiles.innerHTML = data.map(file => `
        <div class="pending-file">
            <div>
                <strong>${escapeHTML(file.name)}</strong>
                <p>${escapeHTML(file.original_filename)}</p>
                <small>${formatFileSize(file.size_bytes)}</small>
            </div>

            <button
                class="button publish-button"
                data-file-id="${escapeHTML(file.id)}"
            >
                Publish
            </button>
        </div>
    `).join("");

    pendingFiles.querySelectorAll(".publish-button").forEach(button => {
        button.addEventListener("click", () => {
            publishFile(button.dataset.fileId, button);
        });
    });
}


// ============================================
// PUBLISH FILE - CODE REQUIRED
// ============================================

async function publishFile(fileId, button) {
    if (!isAdmin) {
        alert("Administrator access required.");
        return;
    }

    // Ask for the publishing code when Publish is clicked.
    const publishingCode = window.prompt(
        "Enter the SchoolDownloads publishing code:"
    );

    // Cancel or empty input: do nothing.
    if (publishingCode === null) return;

    if (!publishingCode.trim()) {
        alert("You need to enter the publishing code.");
        return;
    }

    button.disabled = true;
    button.textContent = "Checking...";

    const { data, error } = await supabaseClient.rpc("publish_file", {
        p_file_id: fileId,
        p_code: publishingCode
    });

    button.disabled = false;
    button.textContent = "Publish";

    if (error || data !== true) {
        console.error(error);
        alert("Publishing failed. Check your code and try again.");
        return;
    }

    alert("File published successfully!");

    await loadPendingFiles();
    await loadFiles();
}


// ============================================
// AUTHENTICATION STATE
// ============================================

supabaseClient.auth.onAuthStateChange(() => {
    setTimeout(() => {
        checkAdmin();
    }, 0);
});


// ============================================
// START WEBSITE
// ============================================

async function startWebsite() {
    await loadFiles();
    await checkAdmin();
}

startWebsite();
