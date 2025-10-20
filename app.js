// Simple SPA storing data in localStorage
const STORAGE_KEY = "fishing_manager_v1";

let state = {
  ponds: [],
  customers: [],
  bookings: [],
  txns: [] // transactions: {type: 'sale'|'expense', date, desc, amount}
};

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try{ state = JSON.parse(raw); }catch(e){ console.error(e); }
  } else {
    // seed sample data: mặc định 1 hồ theo yêu cầu
    state.ponds = [{id: genId(), name:"Hồ Câu Trung Hiếu"}];
    state.customers = []; // để trống — bạn thêm khách khi cần
    saveState();
  }
}

function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function init(){
  loadState();
  bindControls();
  renderPondCustomerSelectors();
  renderDashboard();
  renderTab('ponds');
  renderReportSelectors();
  renderActiveReportView();
}

function bindControls(){
  $('#addPondBtn').addEventListener('click', ()=>{
    const name = $('#pondName').value.trim();
    if(!name) return alert('Nhập tên hồ');
    state.ponds.push({id: genId(), name});
    $('#pondName').value='';
    saveState();
    renderPondCustomerSelectors();
    renderTab(getActiveTab());
  });

  $('#addCustomerBtn').addEventListener('click', ()=>{
    const name = $('#customerName').value.trim();
    if(!name) return alert('Nhập tên khách');
    state.customers.push({id: genId(), name});
    $('#customerName').value='';
    saveState();
    renderPondCustomerSelectors();
    renderTab(getActiveTab());
    renderReportSelectors();
  });

  $('#addBookingBtn').addEventListener('click', ()=>{
    // nếu chỉ có 1 hồ và selector bị khóa, đảm bảo vẫn lấy id đúng
    let pondId = $('#bookingPond').value;
    if(!pondId && state.ponds.length === 1) pondId = state.ponds[0].id;

    const custId = $('#bookingCustomer').value;
    const date = $('#bookingDate').value;
    const hours = parseFloat($('#bookingHours').value) || 0;
    const price = parseFloat($('#bookingPrice').value) || 0;
    if(!pondId || !custId || !date) return alert('Chọn hồ, khách và ngày');
    state.bookings.push({id: genId(), pondId, custId, date, hours, price});
    // also record as sale if price>0 (link to booking via desc includes booking id)
    if(price>0){
      state.txns.push({id: genId(), type:'sale', date, desc:`Booking:${custId}:${pondId}:${genId()}`, amount:price});
    }
    saveState();
    renderTab('bookings');
    renderDashboard();
  });

  $('#addTxnBtn').addEventListener('click', ()=>{
    const type = $('#txnType').value;
    const date = $('#txnDate').value || new Date().toISOString().slice(0,10);
    const desc = $('#txnDesc').value.trim() || (type==='sale'?'Doanh thu':'Chi phí');
    const amount = parseFloat($('#txnAmount').value);
    if(!amount || isNaN(amount)) return alert('Nhập số tiền hợp lệ');
    state.txns.push({id: genId(), type, date, desc, amount});
    $('#txnDesc').value=''; $('#txnAmount').value='';
    saveState();
    renderTab('txns');
    renderDashboard();
  });

  $('#exportCsvBtn').addEventListener('click', exportCSV);
  $('#resetBtn').addEventListener('click', ()=>{
    if(confirm('Bạn có chắc muốn xóa tất cả dữ liệu?')) {
      localStorage.removeItem(STORAGE_KEY);
      state = {ponds:[],customers:[],bookings:[],txns:[]};
      init();
    }
  });

  // tabs
  document.querySelectorAll('.tabs').forEach(tabGroup=>{
    tabGroup.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        // handle both main tabs and report tabs
        const parent = btn.parentElement;
        if(parent.classList.contains('tabs') && parent.parentElement && parent.parentElement.id === 'reports'){
          // report tabs
          parent.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          renderActiveReportView();
        } else {
          // main data tabs
          parent.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          renderTab(btn.dataset.tab);
        }
      });
    });
  });
}

function getActiveTab(){
  const active = document.querySelector('.tabs button.active');
  return active ? active.dataset.tab : 'ponds';
}

function renderPondCustomerSelectors(){
  const pondSel = $('#bookingPond');
  const custSel = $('#bookingCustomer');
  if(!pondSel || !custSel) return;
  pondSel.innerHTML = '<option value="">--Chọn hồ--</option>';
  custSel.innerHTML = '<option value="">--Chọn khách--</option>';
  state.ponds.forEach(p => {
    const o = document.createElement('option'); o.value = p.id; o.textContent = p.name;
    pondSel.appendChild(o);
  });
  state.customers.forEach(c => {
    const o = document.createElement('option'); o.value = c.id; o.textContent = c.name;
    custSel.appendChild(o);
  });
  // set default dates
  $('#bookingDate').value = new Date().toISOString().slice(0,10);
  $('#txnDate').value = new Date().toISOString().slice(0,10);

  // Nếu chỉ có 1 hồ, tự chọn và khóa selector để tiện trên điện thoại
  if(state.ponds.length === 1){
    pondSel.value = state.ponds[0].id;
    pondSel.disabled = true;
  } else {
    pondSel.disabled = false;
  }
}

function pondName(id){ const p = state.ponds.find(x=>x.id===id); return p? p.name : '—'; }
function custName(id){ const c = state.customers.find(x=>x.id===id); return c? c.name : '—'; }

function renderTab(tab){
  const container = $('#tabContent');
  if(tab==='ponds'){
    container.innerHTML = `<h3>Danh sách hồ (${state.ponds.length})</h3>`;
    container.innerHTML += '<table><thead><tr><th>Tên</th><th></th></tr></thead><tbody>' +
      state.ponds.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td><button data-id="${p.id}" class="del-pond">Xóa</button></td></tr>`).join('') +
      '</tbody></table>';
    container.querySelectorAll('.del-pond').forEach(b=>{
      b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        if(confirm('Xóa hồ sẽ không xóa lịch sử liên quan. Tiếp tục?')){
          state.ponds = state.ponds.filter(x=>x.id!==id);
          saveState(); renderPondCustomerSelectors(); renderTab('ponds');
        }
      });
    });
  } else if(tab==='customers'){
    container.innerHTML = `<h3>Danh sách khách (${state.customers.length})</h3>`;
    container.innerHTML += '<table><thead><tr><th>Tên</th><th></th></tr></thead><tbody>' +
      state.customers.map(c=>`<tr><td>${escapeHtml(c.name)}</td><td><button data-id="${c.id}" class="del-cust">Xóa</button></td></tr>`).join('') +
      '</tbody></table>';
    container.querySelectorAll('.del-cust').forEach(b=>{
      b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        if(confirm('Xóa khách sẽ không xóa lịch sử liên quan. Tiếp tục?')){
          state.customers = state.customers.filter(x=>x.id!==id);
          saveState(); renderPondCustomerSelectors(); renderTab('customers');
          renderReportSelectors();
        }
      });
    });
  } else if(tab==='bookings'){
    container.innerHTML = `<h3>Booking (${state.bookings.length})</h3>`;
    container.innerHTML += '<table><thead><tr><th>Ngày</th><th>Hồ</th><th>Khách</th><th>Giờ</th><th>Giá (VNĐ)</th><th></th></tr></thead><tbody>' +
      state.bookings.map(b=>`<tr>
        <td>${b.date}</td>
        <td>${escapeHtml(pondName(b.pondId))}</td>
        <td>${escapeHtml(custName(b.custId))}</td>
        <td>${b.hours}</td>
        <td>${formatVnd(b.price || 0)}</td>
        <td><button data-id="${b.id}" class="del-book">Xóa</button></td>
      </tr>`).join('') +
      '</tbody></table>';
    container.querySelectorAll('.del-book').forEach(b=>{
      b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        if(confirm('Xóa booking?')){
          state.bookings = state.bookings.filter(x=>x.id!==id);
          saveState(); renderTab('bookings'); renderDashboard();
        }
      });
    });
  } else if(tab==='txns'){
    container.innerHTML = `<h3>Doanh thu / Chi phí (${state.txns.length})</h3>`;
    container.innerHTML += '<table><thead><tr><th>Ngày</th><th>Loại</th><th>Mô tả</th><th>Số tiền</th><th></th></tr></thead><tbody>' +
      state.txns.map(t=>`<tr>
        <td>${t.date}</td>
        <td>${t.type}</td>
        <td>${escapeHtml(t.desc)}</td>
        <td>${formatVnd(t.amount)}</td>
        <td><button data-id="${t.id}" class="del-txn">Xóa</button></td>
      </tr>`).join('') +
      '</tbody></table>';
    container.querySelectorAll('.del-txn').forEach(b=>{
      b.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        if(confirm('Xóa giao dịch?')){
          state.txns = state.txns.filter(x=>x.id!==id);
          saveState(); renderTab('txns'); renderDashboard();
        }
      });
    });
  }
}

function renderDashboard(){
  const totalSales = state.txns.filter(t=>t.type==='sale').reduce((s,t)=>s+t.amount,0);
  const totalExpenses = state.txns.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  $('#totalSales').textContent = formatVnd(totalSales);
  $('#totalExpenses').textContent = formatVnd(totalExpenses);
  $('#profit').textContent = formatVnd(totalSales - totalExpenses);

  // prepare monthly revenue chart (sales per month)
  const sales = state.txns.filter(t=>t.type==='sale');
  const byMonth = {};
  sales.forEach(s=>{
    const m = s.date.slice(0,7); // YYYY-MM
    byMonth[m] = (byMonth[m] || 0) + s.amount;
  });
  const months = Object.keys(byMonth).sort();
  const values = months.map(m=>byMonth[m]);

  // draw chart
  const ctx = document.getElementById('revenueChart').getContext('2d');
  if(window._revenueChart){ window._revenueChart.data.labels = months; window._revenueChart.data.datasets[0].data = values; window._revenueChart.update(); }
  else {
    window._revenueChart = new Chart(ctx, {
      type:'bar',
      data:{
        labels: months,
        datasets:[{
          label:'Doanh thu theo tháng (VNĐ)',
          data: values,
          backgroundColor:'#0b5ed7'
        }]
      },
      options:{
        scales:{ y: { ticks: { callback: v => formatVnd(v) } } },
        plugins:{ legend: { display:false } }
      }
    });
  }
}

/* ===== Reports logic ===== */

function renderReportSelectors(){
  const sel = $('#reportCustomer');
  if(!sel) return;
  sel.innerHTML = '<option value="">--Chọn khách--</option>';
  state.customers.forEach(c=>{
    const o = document.createElement('option'); o.value = c.id; o.textContent = c.name;
    sel.appendChild(o);
  });
  // defaults
  $('#reportCustStart').value = '';
  $('#reportCustEnd').value = '';
  $('#reportDate').value = new Date().toISOString().slice(0,10);

  // bind report actions
  $('#genCustReport').addEventListener('click', ()=>{
    const custId = $('#reportCustomer').value;
    const start = $('#reportCustStart').value;
    const end = $('#reportCustEnd').value;
    if(!custId) return alert('Chọn khách để tạo báo cáo');
    renderCustomerReport(custId, start, end);
  });
  $('#exportCustReport').addEventListener('click', exportCustomerReportCsv);

  $('#genDateReport').addEventListener('click', ()=>{
    const date = $('#reportDate').value;
    if(!date) return alert('Chọn ngày để tạo báo cáo');
    renderDateReport(date);
  });
  $('#exportDateReport').addEventListener('click', exportDateReportCsv);
}

function renderActiveReportView(){
  const active = document.querySelector('#reports .tabs button.active');
  const view = active ? active.dataset.report : 'byCustomer';
  document.querySelectorAll('#reportContent [data-view]').forEach(el=>{
    el.style.display = el.dataset.view === view ? 'block' : 'none';
  });
  // if switching to byCustomer refresh selector list
  renderReportSelectors();
}

/*
  Report: doanh thu theo khách
  Logic: lấy tất cả bookings của khách trong khoảng ngày (nếu có) và cộng price.
  Note: hiện tại txns không chứa liên kết custId, nên báo cáo doanh thu theo khách dựa trên bookings (đây là nguồn chính).
*/
function renderCustomerReport(custId, startDate, endDate){
  const rows = state.bookings.filter(b=>{
    if(b.custId !== custId) return false;
    if(startDate && b.date < startDate) return false;
    if(endDate && b.date > endDate) return false;
    return true;
  }).sort((a,b)=> a.date.localeCompare(b.date));

  let html = `<h4>Báo cáo: ${escapeHtml(custName(custId))}</h4>`;
  html += `<div class="small">Từ: ${startDate || '—'} &nbsp; Đến: ${endDate || '—'}</div>`;
  html += '<table style="margin-top:8px"><thead><tr><th>Ngày</th><th>Hồ</th><th>Giờ</th><th>Giá (VNĐ)</th></tr></thead><tbody>';
  let total = 0;
  rows.forEach(r=>{
    total += Number(r.price || 0);
    html += `<tr><td>${r.date}</td><td>${escapeHtml(pondName(r.pondId))}</td><td>${r.hours||0}</td><td>${formatVnd(r.price||0)}</td></tr>`;
  });
  html += `</tbody></table>`;
  html += `<div style="margin-top:8px;font-weight:700">Tổng doanh thu khách: ${formatVnd(total)}</div>`;
  $('#custReportResult').innerHTML = html;
  // store last report in DOM for export
  document.getElementById('custReportResult')._lastReport = {type:'customer', custId, startDate, endDate, rows, total};
}

function exportCustomerReportCsv(){
  const meta = document.getElementById('custReportResult')._lastReport;
  if(!meta) return alert('Chưa có báo cáo để xuất. Vui lòng tạo báo cáo trước.');
  const {rows, total, custId, startDate, endDate} = meta;
  let txt = `Báo cáo doanh thu theo khách\nKhách: ${custName(custId)}\nTừ: ${startDate||''}\nĐến: ${endDate||''}\n\n`;
  txt += 'Ngày,Hồ,Giờ,Giá\n';
  rows.forEach(r => {
    txt += `${r.date},${escapeCsv(pondName(r.pondId))},${r.hours||0},${r.price||0}\n`;
  });
  txt += `\nTổng, , ,${total}\n`;
  downloadText(txt, `report_customer_${custName(custId).replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`);
}

function renderDateReport(date){
  // bookings on date
  const bookings = state.bookings.filter(b => b.date === date);
  // txns on date
  const txns = state.txns.filter(t => t.date === date);

  let html = `<h4>Báo cáo ngày: ${date}</h4>`;
  html += '<div style="margin-top:6px"><strong>Booking</strong></div>';
  html += '<table style="margin-top:6px"><thead><tr><th>Khách</th><th>Hồ</th><th>Giờ</th><th>Giá</th></tr></thead><tbody>';
  let totalSalesFromBookings = 0;
  bookings.forEach(b=>{
    totalSalesFromBookings += Number(b.price || 0);
    html += `<tr><td>${escapeHtml(custName(b.custId))}</td><td>${escapeHtml(pondName(b.pondId))}</td><td>${b.hours||0}</td><td>${formatVnd(b.price||0)}</td></tr>`;
  });
  html += '</tbody></table>';

  html += '<div style="margin-top:8px"><strong>Giao dịch</strong></div>';
  html += '<table style="margin-top:6px"><thead><tr><th>Loại</th><th>Mô tả</th><th>Số tiền</th></tr></thead><tbody>';
  let totalSales = 0, totalExpenses = 0;
  txns.forEach(t=>{
    if(t.type === 'sale') totalSales += Number(t.amount || 0);
    else totalExpenses += Number(t.amount || 0);
    html += `<tr><td>${t.type}</td><td>${escapeHtml(t.desc)}</td><td>${formatVnd(t.amount)}</td></tr>`;
  });
  html += '</tbody></table>';

  // Summary
  const totalRevenue = totalSalesFromBookings; // bookings are the main source per-customer
  const totalTxnSales = totalSales;
  html += `<div style="margin-top:8px;font-weight:700">Tổng từ booking: ${formatVnd(totalSalesFromBookings)}</div>`;
  html += `<div style="font-weight:700">Tổng giao dịch (Doanh thu): ${formatVnd(totalTxnSales)}</div>`;
  html += `<div style="font-weight:700;color:#dc3545">Tổng chi phí: ${formatVnd(totalExpenses)}</div>`;
  $('#dateReportResult').innerHTML = html;
  document.getElementById('dateReportResult')._lastReport = {type:'date', date, bookings, txns, totals:{fromBookings: totalSalesFromBookings, txnSales: totalSales, expenses: totalExpenses}};
}

function exportDateReportCsv(){
  const meta = document.getElementById('dateReportResult')._lastReport;
  if(!meta) return alert('Chưa có báo cáo để xuất. Vui lòng tạo báo cáo trước.');
  const {date, bookings, txns, totals} = meta;
  let txt = `Báo cáo ngày,${date}\n\nBooking\nNgày,Khách,Hồ,Giờ,Giá\n`;
  bookings.forEach(b=>{
    txt += `${date},${escapeCsv(custName(b.custId))},${escapeCsv(pondName(b.pondId))},${b.hours||0},${b.price||0}\n`;
  });
  txt += `\nGiao dich\nLoại,Mô tả,Số tiền\n`;
  txns.forEach(t=> txt += `${t.type},${escapeCsv(t.desc)},${t.amount}\n`);
  txt += `\nTổng booking, ,${totals.fromBookings}\nTổng txn (sale), ,${totals.txnSales}\nTổng chi phí, ,${totals.expenses}\n`;
  downloadText(txt, `report_date_${date}.csv`);
}

/* ===== Utilities ===== */

function exportCSV(){
  // Export ponds, customers, bookings, txns each as CSV and zip-like in a single CSV with sections
  let txt = '';
  txt += '# PONDS\n';
  txt += 'id,name\n';
  state.ponds.forEach(p => txt += `${p.id},${escapeCsv(p.name)}\n`);
  txt += '\n# CUSTOMERS\n';
  txt += 'id,name\n';
  state.customers.forEach(c => txt += `${c.id},${escapeCsv(c.name)}\n`);
  txt += '\n# BOOKINGS\n';
  txt += 'id,pondId,custId,date,hours,price\n';
  state.bookings.forEach(b => txt += `${b.id},${b.pondId},${b.custId},${b.date},${b.hours || 0},${b.price || 0}\n`);
  txt += '\n# TXNS\n';
  txt += 'id,type,date,desc,amount\n';
  state.txns.forEach(t => txt += `${t.id},${t.type},${t.date},${escapeCsv(t.desc)},${t.amount}\n`);

  downloadText(txt, `fishing_data_${new Date().toISOString().slice(0,10)}.csv`);
}

function downloadText(text, filename){
  const blob = new Blob([text], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatVnd(n){ return Number(n || 0).toLocaleString('vi-VN') + ' ₫'; }
function escapeCsv(s){ if(!s) return ''; return `"${String(s).replace(/"/g,'""')}"`; }
function escapeHtml(s){ return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window.addEventListener('load', init);