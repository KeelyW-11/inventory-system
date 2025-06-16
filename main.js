// 簡易國小設備盤點系統主要JS
let data = [];
let classrooms = [];
let currentClassroom = null;
let theme = localStorage.getItem('theme') || 'default';

// 狀態樣式
const statusMap = {
    '未盤點': 'status-unchecked',
    '已盤點': 'status-checked'
};

// 主題樣式
function applyTheme() {
    document.body.classList.remove('theme-high-contrast', 'theme-colorblind');
    if (theme === 'high-contrast') document.body.classList.add('theme-high-contrast');
    if (theme === 'colorblind') document.body.classList.add('theme-colorblind');
}
applyTheme();

document.getElementById('theme-toggle').onclick = function() {
    if (theme === 'default') theme = 'high-contrast';
    else if (theme === 'high-contrast') theme = 'colorblind';
    else theme = 'default';
    localStorage.setItem('theme', theme);
    applyTheme();
    renderTable();
};

// 載入CSV（用fetch模擬，本地用需用Live Server或本地Server啟動，如需可附教學）
function parseCSV(text) {
    const lines = text.trim().split('\n');
    return lines.slice(1).map(line => {
        const [編號, 名稱, 教室, 狀態] = line.split(',');
        return { 編號, 名稱, 教室, 狀態: 狀態 || '未盤點' };
    });
}

function loadCSV() {
    fetch('../csv/equipment.csv')
        .then(resp => resp.text())
        .then(txt => {
            data = parseCSV(txt);
            // 建立教室清單
            classrooms = Array.from(new Set(data.map(d => d.教室))).sort();
            renderClassroomList();
            renderTable();
        });
}

// 顯示教室清單
function renderClassroomList() {
    const list = document.getElementById('classroom-list');
    list.innerHTML = '';
    const allItem = document.createElement('li');
    allItem.textContent = '全部';
    allItem.className = currentClassroom ? '' : 'selected';
    allItem.onclick = function() { currentClassroom = null; renderTable(); renderClassroomList(); };
    list.appendChild(allItem);
    classrooms.forEach(cls => {
        const li = document.createElement('li');
        li.textContent = cls;
        li.className = (currentClassroom === cls) ? 'selected' : '';
        li.onclick = function() { currentClassroom = cls; renderTable(); renderClassroomList(); };
        list.appendChild(li);
    });
}

// 篩選與渲染設備表
function renderTable() {
    const keyword = document.getElementById('search-input').value.trim();
    const tbody = document.querySelector('#equipment-table tbody');
    tbody.innerHTML = '';
    let filter = data.filter(d => 
        (!currentClassroom || d.教室 === currentClassroom) &&
        (d.編號.includes(keyword) || d.名稱.includes(keyword))
    );
    filter.forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${d.編號}</td>
          <td>${d.名稱}</td>
          <td>${d.教室}</td>
          <td>
            <span class="status-cell ${statusMap[d.狀態] || 'status-unchecked'}" data-id="${d.編號}">${d.狀態}</span>
          </td>
          <td>
            <img src="../qrcodes/${d.編號}.png" alt="QR" width="45" height="45" onerror="this.style.display='none'">
          </td>
        `;
        tbody.appendChild(tr);
    });
    // 狀態切換監聽
    document.querySelectorAll('.status-cell').forEach(span => {
        span.onclick = function() {
            const id = span.getAttribute('data-id');
            const idx = data.findIndex(x => x.編號 === id);
            if (data[idx].狀態 === '未盤點') data[idx].狀態 = '已盤點';
            else data[idx].狀態 = '未盤點';
            saveStatus();
            renderTable();
        }
    });
}

// 儲存狀態到 localStorage
function saveStatus() {
    localStorage.setItem('equipment_status', JSON.stringify(data.map(d => ({ 編號: d.編號, 狀態: d.狀態 }))));
}

// 讀取狀態
function restoreStatus() {
    const saved = JSON.parse(localStorage.getItem('equipment_status') || '[]');
    saved.forEach(({ 編號, 狀態 }) => {
        let item = data.find(d => d.編號 === 編號);
        if (item) item.狀態 = 狀態;
    });
}

// 搜尋功能
document.getElementById('search-input').addEventListener('input', renderTable);
document.getElementById('classroom-search').addEventListener('input', function() {
    const kw = this.value.trim();
    classrooms.forEach((cls, idx) => {
        const lis = document.querySelectorAll('#classroom-list li');
        if (idx >= 0 && lis[idx+1]) {
            lis[idx+1].style.display = cls.includes(kw) ? '' : 'none';
        }
    });
});

// 匯出盤點報表
document.getElementById('export-btn').onclick = function() {
    let csv = "編號,名稱,教室,狀態\n";
    data.forEach(d => {
        csv += `${d.編號},${d.名稱},${d.教室},${d.狀態}\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipment_export.csv';
    a.click();
    URL.revokeObjectURL(url);
};

window.onload = function() {
    loadCSV();
    setTimeout(() => {
        restoreStatus();
        renderTable();
    }, 500);
};
