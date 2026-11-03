
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

let allFiles = [];
let selectedCategory = "all";


// ============================================
// ELEMENTS
// ============================================

const fileGrid = document.getElementById("fileGrid");
const searchInput = document.getElementById("searchInput");
const uploadForm = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");
const uploadButton = document.getElementById("uploadButton");


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

function showMessage(element, message, type = "") {
    element.textContent = message;
    element.classList.remove("error", "success");

    if (type) {
        element.classList.add(type);
    }
}

function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) {
        return "Unknown size";
    }

    if (bytes < 1024) {
        return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIcon(filename) {
    const extension = filename.includes(".")
        ? filename.split(".").pop().toLowerCase()
        : "";

    const icons = {
        pdf: "📕",
        doc: "📘",
        docx: "📘",
        txt: "📝",
        rtf: "📝",
        ppt: "📊",
        pptx: "📊",
        xls: "📗",
        xlsx: "📗",
        csv: "📊",
        zip: "🗜️",
        rar: "🗜️",
        "7z": "🗜️",
        png: "🖼️",
        jpg: "🖼️",
        jpeg: "🖼️",
        gif: "🖼️",
        webp: "🖼️",
        mp3: "🎵",
        wav: "🎵",
        mp4: "🎬",
        mov: "🎬",
        exe: "⚙️"
    };

    return icons[extension] || "📄";
}


// ============================================
// LOAD PUBLIC FILES
// ============================================

async function loadFiles() {
    fileGrid.innerHTML = "<p>Loading files...</p>";

    try {
        const { data, error } = await supabaseClient
            .from("files")
            .select("*")
            .eq("is_published", true)
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        allFiles = data || [];
        displayFiles();

    } catch (error) {
        console.error("Loading files failed:", error);
        fileGrid.innerHTML =
            "<p>Couldn't load files. Please try again later.</p>";
    }
}


// ============================================
// DISPLAY FILES
// ============================================

function displayFiles() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    const filteredFiles = allFiles.filter(file => {
        const name = String(file.name || "").toLowerCase();
        const description = String(file.description || "").toLowerCase();

        const matchesSearch =
            name.includes(searchTerm) ||
            description.includes(searchTerm);

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

        const safeUrl = escapeHTML(data.publicUrl);
        const icon = getFileIcon(file.original_filename || file.name);

        return `
            <article class="file-card">
                <div class="file-icon">${icon}</div>

                <h3>${escapeHTML(file.name)}</h3>

                <p>${escapeHTML(
                    file.description || "No description provided."
                )}</p>

                <span class="file-category">
                    ${escapeHTML(file.category || "other")}
                </span>

                <span class="file-size">
                    ${formatFileSize(file.size_bytes)}
                </span>

                <a
                    class="button"
                    href="${safeUrl}"
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
// PUBLIC FILE UPLOAD
// ============================================

uploadForm.addEventListener("submit", async event => {
    event.preventDefault();

    const name = document.getElementById("fileName").value.trim();
    const description =
        document.getElementById("fileDescription").value.trim();

    const category = document.getElementById("fileCategory").value;
    const fileInput = document.getElementById("fileUpload");
    const file = fileInput.files[0];

    if (!name) {
        showMessage(uploadMessage, "Please enter a file title.", "error");
        return;
    }

    if (!file) {
        showMessage(uploadMessage, "Please choose a file.", "error");
        return;
    }

    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";

    showMessage(uploadMessage, "Uploading your file...");

    // Create a unique storage path.
    const safeFilename = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
    ) || "uploaded-file";

    const storagePath =
        `${crypto.randomUUID()}-${safeFilename}`;

    let uploaded = false;

    try {
        // Upload the file to Supabase Storage.
        const { error: storageError } = await supabaseClient
            .storage
            .from(BUCKET_NAME)
            .upload(storagePath, file, {
                contentType: file.type || "application/octet-stream",
                upsert: false
            });

        if (storageError) {
            throw storageError;
        }

        uploaded = true;

        showMessage(
            uploadMessage,
            "File uploaded. Publishing it now..."
        );

        // Create a public database entry immediately.
        const { error: databaseError } = await supabaseClient
            .from("files")
            .insert({
                name: name,
                description: description,
                category: category,
                original_filename: file.name,
                storage_path: storagePath,
                mime_type: file.type || "application/octet-stream",
                size_bytes: file.size,
                is_published: true,
                uploaded_by: null
            });

        if (databaseError) {
            throw databaseError;
        }

        uploadForm.reset();

        showMessage(
            uploadMessage,
            "Your file has been published successfully!",
            "success"
        );

        await loadFiles();

    } catch (error) {
        console.error("Upload failed:", error);

        // Remove the uploaded object if its database entry failed.
        if (uploaded) {
            const { error: cleanupError } = await supabaseClient
                .storage
                .from(BUCKET_NAME)
                .remove([storagePath]);

            if (cleanupError) {
                console.error("Storage cleanup failed:", cleanupError);
            }
        }

        showMessage(
            uploadMessage,
            error.message || "Upload failed. Please try again.",
            "error"
        );

    } finally {
        uploadButton.disabled = false;
        uploadButton.textContent = "Publish File";
    }
});


// ============================================
// START WEBSITE
// ============================================

loadFiles();
