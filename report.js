// ============================================================
// 1. DATA HELPERS (localStorage)
// ============================================================
function getLostItems() {
    const data = localStorage.getItem('lostItems');
    return data ? JSON.parse(data) : [];
}
function setLostItems(items) {
    localStorage.setItem('lostItems', JSON.stringify(items));
}
function getFoundItems() {
    const data = localStorage.getItem('foundItems');
    return data ? JSON.parse(data) : [];
}
function setFoundItems(items) {
    localStorage.setItem('foundItems', JSON.stringify(items));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// ============================================================
// 2. TAB SWITCHING
// ============================================================
document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const tabId = this.dataset.tab;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-' + tabId).classList.add('active');
    });
});

// ============================================================
// 3. REPORT LOST
// ============================================================
document.getElementById('lostForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('lostName').value.trim();
    const category = document.getElementById('lostCategory').value;
    const location = document.getElementById('lostLocation').value.trim();
    const date = document.getElementById('lostDate').value;
    const color = document.getElementById('lostColor').value.trim();
    const description = document.getElementById('lostDescription').value.trim();
    const imageFile = document.getElementById('lostImage').files[0];

    if (!name || !category || !location || !date || !description) {
        showMessage('lostMessage', 'All required fields must be filled.', 'error');
        return;
    }

    let imageData = '';
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            imageData = ev.target.result;
            saveLostItem(name, category, location, date, color, description, imageData);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveLostItem(name, category, location, date, color, description, '');
    }
});

function saveLostItem(name, category, location, date, color, description, imageData) {
    const items = getLostItems();
    const newItem = {
        id: generateId(),
        name,
        category,
        location,
        date,
        color,
        description,
        image: imageData,
        status: 'pending',
        reportedAt: new Date().toISOString(),
        type: 'lost'
    };
    items.push(newItem);
    setLostItems(items);
    document.getElementById('lostForm').reset();
    document.getElementById('lostImage').value = '';
    showMessage('lostMessage', 'Lost item reported successfully!', 'success');
}

// ============================================================
// 4. REPORT FOUND
// ============================================================
document.getElementById('foundForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('foundName').value.trim();
    const category = document.getElementById('foundCategory').value;
    const location = document.getElementById('foundLocation').value.trim();
    const date = document.getElementById('foundDate').value;
    const color = document.getElementById('foundColor').value.trim();
    const description = document.getElementById('foundDescription').value.trim();
    const imageFile = document.getElementById('foundImage').files[0];

    if (!name || !category || !location || !date || !description) {
        showMessage('foundMessage', 'All required fields must be filled.', 'error');
        return;
    }

    let imageData = '';
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            imageData = ev.target.result;
            saveFoundItem(name, category, location, date, color, description, imageData);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveFoundItem(name, category, location, date, color, description, '');
    }
});

function saveFoundItem(name, category, location, date, color, description, imageData) {
    const items = getFoundItems();
    const newItem = {
        id: generateId(),
        name,
        category,
        location,
        date,
        color,
        description,
        image: imageData,
        status: 'pending',
        reportedAt: new Date().toISOString(),
        type: 'found'
    };
    items.push(newItem);
    setFoundItems(items);
    document.getElementById('foundForm').reset();
    document.getElementById('foundImage').value = '';
    showMessage('foundMessage', 'Found item reported successfully!', 'success');
}

// ============================================================
// 5. MESSAGE HELPER
// ============================================================
function showMessage(elementId, text, type = 'success') {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.className = 'form-message ' + type;
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => {
        el.className = 'form-message';
        el.textContent = '';
    }, 5000);
}

// ============================================================
// 6. SEARCH
// ============================================================
function performSearch() {
    const keyword = document.getElementById('searchKeyword').value.trim().toLowerCase();
    const category = document.getElementById('searchCategory').value;
    const location = document.getElementById('searchLocation').value.trim().toLowerCase();
    const dateFrom = document.getElementById('searchDateFrom').value;
    const dateTo = document.getElementById('searchDateTo').value;
    const type = document.getElementById('searchType').value;

    let lost = getLostItems().map(item => ({ ...item, type: 'lost' }));
    let found = getFoundItems().map(item => ({ ...item, type: 'found' }));
    let all = [...lost, ...found];

    all = all.filter(item => {
        if (type === 'lost' && item.type !== 'lost') return false;
        if (type === 'found' && item.type !== 'found') return false;
        if (keyword && !item.name.toLowerCase().includes(keyword)) return false;
        if (category && item.category !== category) return false;
        if (location && !item.location.toLowerCase().includes(location)) return false;
        if (dateFrom && item.date < dateFrom) return false;
        if (dateTo && item.date > dateTo) return false;
        return true;
    });

    all.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
    displayResults(all);
}

function displayResults(items) {
    const container = document.getElementById('searchResults');
    if (items.length === 0) {
        container.innerHTML = `<p style="color:#999; text-align:center; padding:2rem;">No items match your search.</p>`;
        return;
    }

    let html = `<div class="result-grid">`;
    items.forEach(item => {
        const statusClass = item.status === 'resolved' ? 'resolved' : 'pending';
        const typeLabel = item.type === 'lost' ? 'Lost' : 'Found';
        const typeClass = item.type === 'lost' ? 'lost' : 'found';
        html += `
            <div class="result-card" onclick="showItemDetail('${item.id}','${item.type}')">
                <div class="type-badge ${typeClass}">${typeLabel}</div>
                <div class="item-name">${item.name}</div>
                <div class="item-meta">
                    <span><i class="fas fa-list"></i> ${item.category}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${item.location}</span>
                    <span><i class="fas fa-calendar"></i> ${item.date}</span>
                    ${item.color ? `<span><i class="fas fa-palette"></i> ${item.color}</span>` : ''}
                </div>
                <div class="item-desc">${item.description.substring(0, 60)}${item.description.length>60?'...':''}</div>
                <span class="status ${statusClass}">${item.status.toUpperCase()}</span>
            </div>
        `;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function resetSearch() {
    document.getElementById('searchKeyword').value = '';
    document.getElementById('searchCategory').value = '';
    document.getElementById('searchLocation').value = '';
    document.getElementById('searchDateFrom').value = '';
    document.getElementById('searchDateTo').value = '';
    document.getElementById('searchType').value = 'all';
    performSearch();
}

// ============================================================
// 7. ITEM DETAIL MODAL
// ============================================================
function showItemDetail(id, type) {
    let item = null;
    if (type === 'lost') {
        item = getLostItems().find(i => i.id === id);
    } else {
        item = getFoundItems().find(i => i.id === id);
    }
    if (!item) return;

    const modalBody = document.getElementById('modalBody');
    const statusClass = item.status === 'resolved' ? 'resolved' : 'pending';
    const typeLabel = item.type === 'lost' ? 'Lost' : 'Found';
    const typeClass = item.type === 'lost' ? 'lost' : 'found';

    let imageHtml = '';
    if (item.image) {
        imageHtml = `<img src="${item.image}" alt="Item image" style="max-width:100%; max-height:200px; border-radius:8px; margin:0.5rem 0;" />`;
    }

    modalBody.innerHTML = `
        <h3 style="color:#1a3b5d; margin-bottom:0.5rem;">${item.name}</h3>
        <div class="type-badge ${typeClass}" style="font-size:0.8rem;">${typeLabel}</div>
        <div style="margin:1rem 0;">
            <p><i class="fas fa-list"></i> <strong>Category:</strong> ${item.category}</p>
            <p><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${item.location}</p>
            <p><i class="fas fa-calendar"></i> <strong>Date:</strong> ${item.date}</p>
            ${item.color ? `<p><i class="fas fa-palette"></i> <strong>Color:</strong> ${item.color}</p>` : ''}
            <p><i class="fas fa-align-left"></i> <strong>Description:</strong> ${item.description}</p>
            <p><span class="status ${statusClass}">${item.status.toUpperCase()}</span></p>
            ${imageHtml}
            <p style="font-size:0.8rem; color:#999; margin-top:0.5rem;">Reported: ${new Date(item.reportedAt).toLocaleString()}</p>
        </div>
    `;
    document.getElementById('itemModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('itemModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// ============================================================
// 8. AUTO-LOAD SEARCH RESULTS ON SEARCH TAB OPEN
// ============================================================
document.querySelector('[data-tab="search"]').addEventListener('click', function() {
    setTimeout(performSearch, 50);
});

// Also allow Enter key in search filters
document.querySelectorAll('#searchKeyword, #searchCategory, #searchLocation, #searchDateFrom, #searchDateTo, #searchType')
    .forEach(el => {
        el.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    });