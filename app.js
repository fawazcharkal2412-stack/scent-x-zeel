/* ==========================================================================
   SCENT X ZEEL — SUPABASE CLOUD BACKEND ENGINE
   ========================================================================== */

// ==========================================================================
// 1. SUPABASE CLIENT INITIALIZATION
// Credentials are read from window globals injected inline in index.html.
// ==========================================================================
const supabaseUrl = window.ENV_SUPABASE_URL;
const supabaseKey = window.ENV_SUPABASE_ANON_KEY;

// FIXED: Renamed local instance to supabaseClient to prevent collision with global script
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================================================
// 2. WHATSAPP CHECKOUT NUMBER
// ==========================================================================
const WHATSAPP_PHONE = "919619688469";

// ==========================================================================
// 3. APPLICATION STATE
// ==========================================================================
let allPerfumes = []; // Live cloud data snapshot
let distinctBrands = [];
let currentGender = 'all';
let currentBrand = 'all';
let currentSort = 'default';
let searchQuery = '';

// Admin temp state
let adminTempImageBase64 = "";
let logoClickTimestamps = [];

// ==========================================================================
// 4. DOM REFERENCES
// ==========================================================================
const perfumesGrid = document.getElementById('perfumesGrid');
const searchInput = document.getElementById('smartSearch');
const clearSearchBtn = document.getElementById('clearSearch');
const brandSelect = document.getElementById('brandSelect');
const sortBySelect = document.getElementById('sortBy');
const resultsCount = document.getElementById('resultsCount');
const resetFiltersBtn = document.getElementById('resetFilters');
const genderTabs = document.querySelectorAll('.gender-tab');

// Modal
const perfumeModal = document.getElementById('perfumeModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalBrand = document.getElementById('modalBrand');
const modalGender = document.getElementById('modalGender');
const modalName = document.getElementById('modalName');
const modalVolume = document.getElementById('modalVolume');
const modalTopNotes = document.getElementById('modalTopNotes');
const modalHeartNotes = document.getElementById('modalHeartNotes');
const modalBaseNotes = document.getElementById('modalBaseNotes');
const modalDescription = document.getElementById('modalDescription');
const modalWhatsappBtn = document.getElementById('modalWhatsappBtn');

// Admin
const logoArea = document.getElementById('logoArea');
const adminSidebar = document.getElementById('adminSidebar');
const adminSidebarClose = document.getElementById('adminSidebarClose');
const adminProductForm = document.getElementById('adminProductForm');
const adminEditId = document.getElementById('adminEditId');
const formTitle = document.getElementById('formTitle');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const adminImageFileInput = document.getElementById('adminImageFile');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreview = document.getElementById('imagePreview');
const adminItemsList = document.getElementById('adminItemsList');

// Layout switches
const toggleFullWidthBtn = document.getElementById('toggleFullWidthBtn');
const toggleCompactCards = document.getElementById('toggleCompactCards');
const toggleHideBadges = document.getElementById('toggleHideBadges');

// Back to top
const backToTopBtn = document.getElementById('backToTop');

/* ==========================================================================
   5. LIFECYCLE — BOOT
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    loadCloudCatalog();
    initLayoutSettings();
    attachEventListeners();
});

/* ==========================================================================
   6. CLOUD DATA HYDRATION — Supabase 'perfumes' table
   ========================================================================== */
async function loadCloudCatalog() {
    // Show skeleton state
    perfumesGrid.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;

    // FIXED: Swapped to supabaseClient
    const { data, error } = await supabaseClient
        .from('perfumes')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error("Supabase catalog fetch error:", error);
        showCatalogError();
        return;
    }

    allPerfumes = data || [];

    // Build brand list
    const brands = allPerfumes.map(p => (p.brand || '').trim());
    distinctBrands = [...new Set(brands)].filter(Boolean).sort();

    rebuildBrandDropdown();
    filterAndRender();
    renderAdminCatalogList();
}

function showCatalogError() {
    resultsCount.textContent = "Connection error";
    perfumesGrid.innerHTML = `
        <div class="no-results-container">
            <i class="fa-solid fa-circle-exclamation no-results-icon" style="color:#ef4444;"></i>
            <h3 class="no-results-title">Cloud Connection Error</h3>
            <p class="no-results-desc">Unable to reach the Supabase catalog database. Please check your connection and try refreshing.</p>
        </div>
    `;
}

function rebuildBrandDropdown() {
    brandSelect.innerHTML = '<option value="all">All Brands</option>';
    distinctBrands.forEach(brand => {
        const opt = document.createElement('option');
        opt.value = brand;
        opt.textContent = brand;
        if (brand === currentBrand) opt.selected = true;
        brandSelect.appendChild(opt);
    });
}

/* ==========================================================================
   7. TRIPLE-CLICK CRYPTOGRAPHIC GATEWAY — Cloud password check
   ========================================================================== */
logoArea.addEventListener('click', () => {
    const now = Date.now();

    // Maintain a rolling 2-second click window
    logoClickTimestamps = logoClickTimestamps.filter(t => now - t < 2000);
    logoClickTimestamps.push(now);

    if (logoClickTimestamps.length >= 3) {
        logoClickTimestamps = [];

        const input = prompt("Scent X Zeel — Administrative Access\n\nEnter credentials key:");
        if (input === null) return; // Dismissed

        verifyAdminPassword(input);
    }
});

async function verifyAdminPassword(enteredValue) {
    // FIXED: Swapped to supabaseClient
    const { data, error } = await supabaseClient
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_password')
        .single();

    if (error || !data) {
        console.error("Admin password lookup error:", error);
        alert("Authentication service unavailable. Please try again later.");
        return;
    }

    if (enteredValue === data.value) {
        openAdminSidebar();
    } else {
        alert("Security Alert: Invalid Administrative Credentials.");
    }
}

function openAdminSidebar() {
    adminSidebar.classList.add('active');
    adminSidebar.setAttribute('aria-hidden', 'false');
}

function closeAdminSidebar() {
    adminSidebar.classList.remove('active');
    adminSidebar.setAttribute('aria-hidden', 'true');
    resetAdminForm();
}

/* ==========================================================================
   8. MEMORY-SAFE CANVAS COMPRESSION PIPELINE
   ========================================================================== */
adminImageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
        adminTempImageBase64 = "";
        imagePreviewContainer.style.display = "none";
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDimension = 360;
            let w = img.width;
            let h = img.height;

            if (w > h) {
                if (w > maxDimension) { h = Math.round((h * maxDimension) / w); w = maxDimension; }
            } else {
                if (h > maxDimension) { w = Math.round((w * maxDimension) / h); h = maxDimension; }
            }

            canvas.width = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);

            // 70% JPEG quality compress → Base64
            adminTempImageBase64 = canvas.toDataURL("image/jpeg", 0.7);

            imagePreview.src = adminTempImageBase64;
            imagePreviewContainer.style.display = "flex";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

/* ==========================================================================
   9. LAYOUT ADJUSTER SWITCHES (persisted in LocalStorage)
   ========================================================================== */
function initLayoutSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem('scent_zeel_layout') || '{}');
        toggleFullWidthBtn.checked = !!saved.fullWidthBtn;
        toggleCompactCards.checked = !!saved.compactCards;
        toggleHideBadges.checked = !!saved.hideBadges;
    } catch (_) { }
    applyLayoutClasses();
}

function saveLayoutSettings() {
    localStorage.setItem('scent_zeel_layout', JSON.stringify({
        fullWidthBtn: toggleFullWidthBtn.checked,
        compactCards: toggleCompactCards.checked,
        hideBadges: toggleHideBadges.checked
    }));
    applyLayoutClasses();
}

function applyLayoutClasses() {
    perfumesGrid.classList.toggle('grid-btn-full', toggleFullWidthBtn.checked);
    perfumesGrid.classList.toggle('grid-compact-cards', toggleCompactCards.checked);
    perfumesGrid.classList.toggle('grid-hide-badges', toggleHideBadges.checked);
}

[toggleFullWidthBtn, toggleCompactCards, toggleHideBadges].forEach(el =>
    el.addEventListener('change', saveLayoutSettings)
);

/* ==========================================================================
   10. FILTER, SEARCH & SORT ENGINE
   ========================================================================== */
function filterAndRender() {
    let filtered = [...allPerfumes];

    if (currentGender !== 'all') {
        filtered = filtered.filter(p =>
            (p.gender || '').toLowerCase() === currentGender.toLowerCase()
        );
    }

    if (currentBrand !== 'all') {
        filtered = filtered.filter(p =>
            (p.brand || '').toLowerCase() === currentBrand.toLowerCase()
        );
    }

    if (searchQuery.trim() !== '') {
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
        filtered = filtered.filter(p => {
            const blob = `${p.brand} ${p.name} ${p.notes} ${p.description} ${p.gender} ${p.volume}`.toLowerCase();
            return terms.every(t => blob.includes(t));
        });
    }

    if (currentSort === 'name-asc') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    if (currentSort === 'name-desc') filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    if (currentSort === 'brand-asc') filtered.sort((a, b) => (a.brand || '').localeCompare(b.brand || '') || (a.name || '').localeCompare(b.name || ''));

    updateStats(filtered.length);
    renderGrid(filtered);
}

function updateStats(count) {
    resultsCount.textContent = count === allPerfumes.length
        ? `Showing all ${count} perfumes`
        : `Found ${count} matching perfumes`;

    const isFiltered = currentGender !== 'all' || currentBrand !== 'all' || searchQuery.trim() !== '' || currentSort !== 'default';
    resetFiltersBtn.style.display = isFiltered ? 'inline-block' : 'none';
}

/* ==========================================================================
   11. GRID CARD RENDERER
   ========================================================================== */
function renderGrid(perfumes) {
    if (perfumes.length === 0) {
        perfumesGrid.innerHTML = `
            <div class="no-results-container">
                <i class="fa-solid fa-magnifying-glass-minus no-results-icon"></i>
                <h3 class="no-results-title">No Matching Fragrances</h3>
                <p class="no-results-desc">No perfumes match your current filters. Clear the search or reset filters.</p>
            </div>`;
        return;
    }

    perfumesGrid.innerHTML = perfumes.map(p => {
        const imgSrc = resolveImageSrc(p);
        const gClass = resolveGenderClass(p.gender);
        const waLink = buildWhatsAppLink(p);

        return `
        <article class="perfume-card" data-id="${p.id}">
            <div class="card-img-wrapper">
                <div class="card-badges">
                    <span class="gender-badge ${gClass}">${p.gender || ''}</span>
                    <span class="volume-badge">${p.volume || ''}</span>
                </div>
                <img src="${imgSrc}" alt="${p.brand} ${p.name}" class="card-img" loading="lazy" onerror="this.src='logo.jpg';">
            </div>
            <div class="card-info">
                <span class="card-brand">${p.brand || ''}</span>
                <h2 class="card-name">${p.name || ''}</h2>
                <p class="card-notes"><strong>Notes:</strong> ${p.notes || ''}</p>
                <div class="card-actions">
                    <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="whatsapp-btn">
                        <i class="fa-brands fa-whatsapp"></i> Order on WhatsApp
                    </a>
                </div>
            </div>
        </article>`;
    }).join('');
}

// Resolve product image — supports Base64 stored in cloud or local catalogue path
function resolveImageSrc(p) {
    const imgField = p.image_url || p.image || '';
    if (!imgField) return 'logo.jpg';
    if (imgField.startsWith('data:image/')) return imgField;

    // Correct known filename spacing mismatch in local CATALOGUE folder
    let corrected = imgField.trim().replace("BRANDED PERFUME_", "BRANDED PERFUME _");
    return `CATALOGUE/${corrected}`;
}

function resolveGenderClass(gender) {
    const g = (gender || '').toLowerCase();
    if (g === 'men') return 'men';
    if (g === 'women') return 'women';
    return 'unisex';
}

function buildWhatsAppLink(p) {
    const text = `Hello Scent X Zeel, I would like to order ${p.brand} ${p.name} (${p.volume}) from the catalog.`;
    return `https://wa.me/${WHATSAPP_PHONE.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

/* ==========================================================================
   12. DETAIL MODAL
   ========================================================================== */
function openModal(id) {
    const p = allPerfumes.find(x => String(x.id) === String(id));
    if (!p) return;

    const notesArr = (p.notes || '').split(',').map(n => n.trim());
    const third = Math.ceil(notesArr.length / 3);

    modalImage.src = resolveImageSrc(p);
    modalImage.alt = `${p.brand} ${p.name}`;
    modalBrand.textContent = p.brand || '';
    modalGender.className = `modal-gender-badge ${resolveGenderClass(p.gender)}`;
    modalGender.textContent = p.gender || '';
    modalName.textContent = p.name || '';
    modalVolume.textContent = `Bottle capacity: ${p.volume || ''}`;
    modalTopNotes.textContent = notesArr.slice(0, third).join(', ') || '—';
    modalHeartNotes.textContent = notesArr.slice(third, third * 2).join(', ') || '—';
    modalBaseNotes.textContent = notesArr.slice(third * 2).join(', ') || '—';
    modalDescription.textContent = p.description || '';
    modalWhatsappBtn.setAttribute('href', buildWhatsAppLink(p));

    perfumeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    perfumeModal.classList.remove('active');
    document.body.style.overflow = '';
}

/* ==========================================================================
   13. CLOUD ADMIN — INSERT / DELETE via Supabase
   ========================================================================== */

// --- INSERT (Add New Product) ---
adminProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const editId = adminEditId.value;
    const brand = document.getElementById('adminBrand').value.trim();
    const name = document.getElementById('adminName').value.trim();
    const volume = document.getElementById('adminVolume').value.trim();
    const gender = document.getElementById('adminGender').value;
    const topN = document.getElementById('adminTopNotes').value.trim();
    const heartN = document.getElementById('adminHeartNotes').value.trim();
    const baseN = document.getElementById('adminBaseNotes').value.trim();
    const desc = document.getElementById('adminDescription').value.trim();
    const notes = `${topN}, ${heartN}, ${baseN}`;

    const submitBtn = document.getElementById('submitFormBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    if (editId) {
        // UPDATE existing row
        const existing = allPerfumes.find(p => String(p.id) === String(editId));
        const image_url = adminTempImageBase64 !== '' ? adminTempImageBase64 : (existing ? (existing.image_url || existing.image || '') : '');

        // FIXED: Swapped to supabaseClient
        const { error } = await supabaseClient
            .from('perfumes')
            .update({ brand, name, volume, gender, notes, description: desc, image_url })
            .eq('id', editId);

        if (error) {
            console.error("Supabase update error:", error);
            alert(`Update failed: ${error.message}`);
        } else {
            alert("Product updated successfully in cloud.");
        }
    } else {
        // INSERT new row
        const image_url = adminTempImageBase64 !== '' ? adminTempImageBase64 : '';

        // FIXED: Swapped to supabaseClient
        const { error } = await supabaseClient
            .from('perfumes')
            .insert([{ brand, name, volume, gender, notes, description: desc, image_url }]);

        if (error) {
            console.error("Supabase insert error:", error);
            alert(`Insert failed: ${error.message}`);
        } else {
            alert("New product saved to cloud catalog.");
        }
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save to Cloud';

    // Refresh live catalog from cloud
    await loadCloudCatalog();
    resetAdminForm();
});

// --- DELETE row from Supabase ---
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to permanently delete this product from the cloud catalog?")) return;

    // FIXED: Swapped to supabaseClient
    const { error } = await supabaseClient
        .from('perfumes')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Supabase delete error:", error);
        alert(`Delete failed: ${error.message}`);
        return;
    }

    alert("Product permanently removed from cloud.");
    await loadCloudCatalog();
}

// --- EDIT — prefill the form ---
function editProduct(id) {
    const p = allPerfumes.find(x => String(x.id) === String(id));
    if (!p) return;

    adminEditId.value = p.id;
    document.getElementById('adminBrand').value = p.brand || '';
    document.getElementById('adminName').value = p.name || '';
    document.getElementById('adminVolume').value = p.volume || '';
    document.getElementById('adminGender').value = p.gender || 'Unisex';

    const notesArr = (p.notes || '').split(',').map(n => n.trim());
    const third = Math.ceil(notesArr.length / 3);
    document.getElementById('adminTopNotes').value = notesArr.slice(0, third).join(', ');
    document.getElementById('adminHeartNotes').value = notesArr.slice(third, third * 2).join(', ');
    document.getElementById('adminBaseNotes').value = notesArr.slice(third * 2).join(', ');
    document.getElementById('adminDescription').value = p.description || '';

    adminTempImageBase64 = '';
    const imgSrc = resolveImageSrc(p);
    imagePreview.src = imgSrc;
    imagePreviewContainer.style.display = imgSrc !== 'logo.jpg' ? 'flex' : 'none';

    formTitle.textContent = `Edit: ${p.name}`;
    cancelEditBtn.style.display = 'inline-block';
    adminProductForm.scrollIntoView({ behavior: 'smooth' });
}

function resetAdminForm() {
    adminProductForm.reset();
    adminEditId.value = '';
    adminTempImageBase64 = '';
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '';
    formTitle.textContent = 'Add New Product';
    cancelEditBtn.style.display = 'none';
}

function renderAdminCatalogList() {
    adminItemsList.innerHTML = allPerfumes.map(p => `
        <div class="admin-item-row">
            <div class="admin-item-info">
                <span class="admin-item-name">${p.name || '—'}</span>
                <span class="admin-item-brand">${p.brand || ''} (${p.volume || ''})</span>
            </div>
            <div class="admin-item-actions">
                <button onclick="editProduct('${p.id}')" class="admin-action-icon-btn edit" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button onclick="deleteProduct('${p.id}')" class="admin-action-icon-btn delete" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>`).join('');
}

// Expose admin handlers to global scope (called from inline HTML)
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;

/* ==========================================================================
   14. EVENT LISTENERS
   ========================================================================== */
function attachEventListeners() {

    // Card grid delegated clicks — modal vs WhatsApp propagation control
    perfumesGrid.addEventListener('click', (e) => {
        // WhatsApp button — stopPropagation so the card modal does NOT fire
        const waBtn = e.target.closest('.whatsapp-btn');
        if (waBtn) {
            e.stopPropagation();
            return; // Let the anchor navigate normally
        }

        // Anywhere else on the card — open detail modal
        const card = e.target.closest('.perfume-card');
        if (card) openModal(card.dataset.id);
    });

    // Smart search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        clearSearchBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
        filterAndRender();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        filterAndRender();
    });

    // Gender tabs
    genderTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            genderTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentGender = tab.dataset.gender;
            filterAndRender();
        });
    });

    // Brand select
    brandSelect.addEventListener('change', (e) => {
        currentBrand = e.target.value;
        filterAndRender();
    });

    // Sort select
    sortBySelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        filterAndRender();
    });

    // Reset all filters
    resetFiltersBtn.addEventListener('click', () => {
        currentGender = 'all';
        currentBrand = 'all';
        currentSort = 'default';
        searchQuery = '';

        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        brandSelect.value = 'all';
        sortBySelect.value = 'default';
        genderTabs.forEach(t => {
            if (t.dataset.gender === 'all') t.classList.add('active');
            else t.classList.remove('active');
        });

        filterAndRender();
    });

    // Modal close
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && perfumeModal.classList.contains('active')) closeModal();
    });

    // Admin sidebar close
    adminSidebarClose.addEventListener('click', closeAdminSidebar);
    cancelEditBtn.addEventListener('click', resetAdminForm);

    // Back to top visibility
    window.addEventListener('scroll', () => {
        backToTopBtn.classList.toggle('visible', window.scrollY > 400);
    });
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}