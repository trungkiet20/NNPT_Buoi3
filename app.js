const API_BASE = 'https://api.escuelajs.co/api/v1';
let products = [];
let categories = [];
let filtered = [];
let currentPage = 1;
let pageSize = 10;
let sortState = { field: null, dir: 1 }; // dir: 1 = asc, -1 = desc

// Elements
const tableBody = document.getElementById('tableBody');
const paginationEl = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const stats = document.getElementById('stats');
const sortTitleBtn = document.getElementById('sortTitle');
const sortPriceBtn = document.getElementById('sortPrice');
const btnExport = document.getElementById('btnExport');

// Modals & forms
const viewModalEl = document.getElementById('viewModal');
const viewModal = new bootstrap.Modal(viewModalEl);
const editForm = document.getElementById('editForm');
const editId = document.getElementById('editId');
const editTitle = document.getElementById('editTitle');
const editPrice = document.getElementById('editPrice');
const editDescription = document.getElementById('editDescription');
const editCategory = document.getElementById('editCategory');
const editImages = document.getElementById('editImages');
const btnSave = document.getElementById('btnSave');

const createModalEl = document.getElementById('createModal');
const createModal = new bootstrap.Modal(createModalEl);
const createTitle = document.getElementById('createTitle');
const createPrice = document.getElementById('createPrice');
const createDescription = document.getElementById('createDescription');
const createCategory = document.getElementById('createCategory');
const createImages = document.getElementById('createImages');
const btnCreateSubmit = document.getElementById('btnCreateSubmit');

// Init
async function init() {
  try {
    await Promise.all([fetchCategories(), fetchProducts()]);
    attachListeners();
    applyFilterAndRender();
  } catch (err) {
    console.error(err);
    alert('Lỗi khi tải dữ liệu. Xem console.');
  }
}

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`);
  const data = await res.json();
  products = data;
  return products;
}

async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  const data = await res.json();
  categories = data;
  populateCategorySelects();
  return categories;
}

function populateCategorySelects() {
  [editCategory, createCategory].forEach(sel => {
    sel.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  });
}

function attachListeners() {
  searchInput.addEventListener('input', () => { currentPage = 1; applyFilterAndRender(); });
  pageSizeSelect.addEventListener('change', () => { pageSize = +pageSizeSelect.value; currentPage = 1; applyFilterAndRender(); });
  sortTitleBtn.addEventListener('click', () => toggleSort('title'));
  sortPriceBtn.addEventListener('click', () => toggleSort('price'));
  btnExport.addEventListener('click', exportCSV);

  btnSave.addEventListener('click', saveEdit);
  btnCreateSubmit.addEventListener('click', createItem);
}

function applyFilterAndRender() {
  const q = searchInput.value.trim().toLowerCase();
  filtered = products.filter(p => p.title.toLowerCase().includes(q));
  if (sortState.field) {
    filtered.sort((a, b) => {
      const v1 = a[sortState.field];
      const v2 = b[sortState.field];
      if (typeof v1 === 'string') return v1.localeCompare(v2) * sortState.dir;
      return (v1 - v2) * sortState.dir;
    });
  }
  render();
}

function render() {
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  tableBody.innerHTML = pageItems.map(p => {
    const catName = p.category ? p.category.name : (p.categoryId ? `#${p.categoryId}` : '—');
    const imgHtml = p.images && p.images.length ? `<img src="${p.images[0]}" class="thumb" alt="img">` : '';
    // the row has tooltip showing description
    const description = (p.description || '').replace(/"/g, '&quot;');
    return `
      <tr class="hover-row" data-id="${p.id}" data-bs-toggle="tooltip" data-bs-placement="top" title="${description}">
        <td>${p.id}</td>
        <td>${escapeHtml(p.title)}</td>
        <td>${p.price}</td>
        <td>${escapeHtml(catName)}</td>
        <td>${imgHtml}</td>
      </tr>
    `;
  }).join('');

  // attach click listeners to rows
  Array.from(tableBody.querySelectorAll('tr[data-id]')).forEach(tr => {
    tr.addEventListener('click', () => openViewModal(+tr.dataset.id));
  });

  // enable bootstrap tooltips for rows
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  renderPagination(totalPages);
  stats.textContent = `Hiển thị ${start + 1}-${Math.min(start + pageSize, total)} / ${total} kết quả`;
}

function renderPagination(totalPages) {
  let html = '';
  html += `<li class="page-item ${currentPage===1? 'disabled':''}"><a class="page-link" href="#" data-page="${currentPage-1}">Previous</a></li>`;
  for (let i=1;i<=totalPages;i++) {
    html += `<li class="page-item ${i===currentPage? 'active':''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
  }
  html += `<li class="page-item ${currentPage===totalPages? 'disabled':''}"><a class="page-link" href="#" data-page="${currentPage+1}">Next</a></li>`;
  paginationEl.innerHTML = html;
  paginationEl.querySelectorAll('a.page-link').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const p = +a.dataset.page;
    if (p>=1 && p<=totalPages) { currentPage = p; render(); }
  }));
}

function toggleSort(field) {
  if (sortState.field === field) sortState.dir = -sortState.dir; else { sortState.field = field; sortState.dir = 1; }
  applyFilterAndRender();
}

async function openViewModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return alert('Item not found');
  editId.value = p.id;
  editTitle.value = p.title;
  editPrice.value = p.price;
  editDescription.value = p.description || '';
  editCategory.value = (p.category && p.category.id) ? p.category.id : (p.categoryId || (categories[0] && categories[0].id));
  editImages.value = (p.images && p.images.join(', ')) || '';
  viewModal.show();
}

async function saveEdit() {
  const id = editId.value;
  const payload = {
    title: editTitle.value,
    price: Number(editPrice.value),
    description: editDescription.value,
    categoryId: Number(editCategory.value),
    images: editImages.value.split(',').map(s => s.trim()).filter(Boolean)
  };
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Update failed');
    const updated = await res.json();
    // update local data
    const idx = products.findIndex(x => x.id === updated.id);
    if (idx>=0) products[idx] = updated; else products.unshift(updated);
    applyFilterAndRender();
    viewModal.hide();
    alert('Cập nhật thành công');
  } catch (err) {
    console.error(err);
    alert('Lỗi khi cập nhật. Xem console.');
  }
}

async function createItem() {
  const payload = {
    title: createTitle.value,
    price: Number(createPrice.value),
    description: createDescription.value,
    categoryId: Number(createCategory.value),
    images: createImages.value.split(',').map(s => s.trim()).filter(Boolean)
  };
  try {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Create failed');
    const created = await res.json();
    products.unshift(created);
    applyFilterAndRender();
    createModal.hide();
    alert('Tạo thành công');
    // reset form
    document.getElementById('createForm').reset();
  } catch (err) {
    console.error(err);
    alert('Lỗi khi tạo. Xem console.');
  }
}

function exportCSV() {
  const start = (currentPage-1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);
  const rows = pageItems.map(p => ({
    id: p.id,
    title: p.title,
    price: p.price,
    category: p.category ? p.category.name : (p.categoryId || ''),
    images: (p.images || []).join('|'),
  }));
  const header = ['id','title','price','category','images'];
  const csv = [header.join(',')].concat(rows.map(r => header.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `products_page_${currentPage}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Start
init();