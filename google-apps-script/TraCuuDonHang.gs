/**
 * Thợ Đúng – API tra cứu trạng thái đơn lắp đặt (Google Apps Script)
 *
 * Gắn script này vào file Google Sheets chứa đơn hàng:
 *   Tiện ích mở rộng → Apps Script → dán toàn bộ file này → Lưu.
 * Xem README.md (mục "Tra cứu đơn hàng") để biết cách triển khai.
 *
 * Bảo mật:
 *  - File Sheets vẫn để riêng tư, không cần chia sẻ công khai.
 *  - Chỉ trả về 1 đơn khi KHỚP cả mã đơn và 3 số cuối SĐT.
 *  - Không bao giờ trả về số điện thoại, tên, địa chỉ khách.
 *  - Sai quá MAX_FAILS lần cho cùng 1 mã đơn → khóa mã đó LOCK_MINUTES phút.
 *  - Chỉ website (có khóa TRACK_KEY) mới gọi được.
 */

const CONFIG = {
  // Tên các sheet cần tìm, theo thứ tự ưu tiên (sheet đầu được ưu tiên nếu trùng mã).
  SHEETS: ['KH1', 'KH2'],

  // Dòng tiêu đề (thường là dòng 1).
  HEADER_ROW: 1,

  // Tên cột được nhận theo tiêu đề, không phân biệt hoa thường và dấu.
  // Thêm tên cột thật của bạn vào danh sách nếu khác.
  COLS: {
    code:        ['mã đơn hàng', 'mã đơn', 'mã vận đơn', 'order id', 'order code', 'tracking id'],
    phone:       ['số điện thoại', 'sđt', 'sdt', 'điện thoại', 'sđt khách hàng', 'số điện thoại khách hàng', 'phone'],
    status:      ['trạng thái lắp đặt', 'trạng thái', 'status'],
    orderDate:   ['ngày đơn hàng', 'ngày tạo đơn', 'ngày đặt hàng'],
    installDate: ['ngày lắp đặt', 'ngày hẹn lắp', 'lịch hẹn', 'ngày hẹn'],
    province:    ['tỉnh', 'tỉnh/thành', 'tỉnh thành', 'khu vực'],
    service:     ['dịch vụ', 'sản phẩm', 'loại dịch vụ'],
    customerNote:['ghi chú cho khách'] // chỉ cột ghi chú dành riêng cho khách mới được hiển thị
  },

  MAX_FAILS: 5,
  LOCK_MINUTES: 15
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const key = PropertiesService.getScriptProperties().getProperty('TRACK_KEY');
  if (!key || p.key !== key) return out_({ ok: false, error: 'unauthorized' });

  const code = normCode_(p.code);
  const last3 = String(p.p || '').replace(/\D/g, '');
  if (!code || code.length < 4 || code.length > 40 || last3.length !== 3) {
    return out_({ ok: false, error: 'invalid' });
  }

  const cache = CacheService.getScriptCache();
  const failKey = 'fail:' + code;
  const fails = Number(cache.get(failKey) || 0);
  if (fails >= CONFIG.MAX_FAILS) return out_({ ok: false, error: 'locked', minutes: CONFIG.LOCK_MINUTES });

  const order = findOrder_(code, last3);
  if (!order) {
    cache.put(failKey, String(fails + 1), CONFIG.LOCK_MINUTES * 60);
    return out_({ ok: false, error: 'not_found' });
  }
  cache.remove(failKey);
  return out_({ ok: true, order: order });
}

function findOrder_(code, last3) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const name of CONFIG.SHEETS) {
    const sh = ss.getSheetByName(name);
    if (!sh) continue;
    const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
    if (lastRow <= CONFIG.HEADER_ROW) continue;

    const header = sh.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getDisplayValues()[0];
    const idx = mapColumns_(header);
    if (idx.code < 0 || idx.phone < 0) continue; // sheet thiếu cột mã đơn hoặc SĐT

    const first = CONFIG.HEADER_ROW + 1;
    const hits = sh.getRange(first, idx.code + 1, lastRow - CONFIG.HEADER_ROW, 1)
      .createTextFinder(code).matchCase(false).matchEntireCell(true).findAll();

    // Duyệt từ dòng mới nhất lên (đơn lắp lại thường nằm ở dưới).
    for (let i = hits.length - 1; i >= 0; i--) {
      const row = sh.getRange(hits[i].getRow(), 1, 1, lastCol).getDisplayValues()[0];
      const phone = String(row[idx.phone] || '').replace(/\D/g, '');
      if (phone.length >= 3 && phone.slice(-3) === last3) {
        const get = (k) => (idx[k] >= 0 ? String(row[idx[k]] || '').trim() : '');
        return {
          code: String(row[idx.code]).trim(),
          status: get('status'),
          orderDate: get('orderDate'),
          installDate: get('installDate'),
          province: get('province'),
          service: get('service'),
          note: get('customerNote')
        };
      }
    }
  }
  return null;
}

function mapColumns_(header) {
  const norm = header.map(normText_);
  const idx = {};
  Object.keys(CONFIG.COLS).forEach(function (k) {
    idx[k] = -1;
    for (const alias of CONFIG.COLS[k]) {
      const at = norm.indexOf(normText_(alias));
      if (at >= 0) { idx[k] = at; break; }
    }
  });
  return idx;
}

function normText_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normCode_(s) {
  return String(s || '').replace(/\s+/g, '').toUpperCase();
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Chạy hàm này 1 lần trong trình soạn Apps Script để kiểm tra cấu hình:
 * nó in ra sheet nào tìm thấy, cột nào nhận được. Không in dữ liệu khách.
 */
function kiemTraCauHinh() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  CONFIG.SHEETS.forEach(function (name) {
    const sh = ss.getSheetByName(name);
    if (!sh) { Logger.log('❌ Không thấy sheet "%s"', name); return; }
    const header = sh.getRange(CONFIG.HEADER_ROW, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
    const idx = mapColumns_(header);
    const found = Object.keys(idx).map(function (k) {
      return k + ': ' + (idx[k] >= 0 ? '"' + header[idx[k]] + '"' : '(không có)');
    });
    Logger.log('✅ Sheet "%s" – %s dòng\n  %s', name, sh.getLastRow() - CONFIG.HEADER_ROW, found.join('\n  '));
  });
  Logger.log(PropertiesService.getScriptProperties().getProperty('TRACK_KEY') ? 'TRACK_KEY: đã đặt' : '⚠️ Chưa đặt TRACK_KEY');
}
