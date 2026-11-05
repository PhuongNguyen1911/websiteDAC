# Website Thợ Đúng (thodung.co)

Website tĩnh (HTML/CSS/JS thuần, không cần build) + 1 Cloudflare Pages Function nhận form.

```
index.html            Trang chủ (giới thiệu, năng lực, dịch vụ, vận hành, công nghệ, đối tác, hành trình, liên hệ)
dich-vu/index.html    Trang Dịch vụ (catalog thiết bị, giải pháp doanh nghiệp, quy trình, FAQ, đặt lịch)
404.html              Trang lỗi
functions/api/lead.js API nhận form → Telegram / Webhook / Email
tra-cuu/index.html    Trang tra cứu đơn hàng
functions/api/tra-cuu.js  API tra cứu đơn → Google Apps Script
google-apps-script/   Script dán vào Google Sheets (không chứa bí mật)
assets/               CSS, JS, font Be Vietnam Pro (tự host), icon, logo, ảnh
_headers              Cache + bảo mật cho Cloudflare
robots.txt, sitemap.xml, site.webmanifest
```

## Deploy lên Cloudflare Pages (qua GitHub)

1. Tạo repo trên GitHub, đẩy toàn bộ thư mục này lên (nhánh `main`).
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → chọn repo.
3. Cấu hình build:
   - Framework preset: **None**
   - Build command: *(để trống)*
   - Build output directory: `/`
4. **Save and Deploy**. Thư mục `functions/` được Cloudflare tự nhận làm API `/api/lead`.
5. Gắn tên miền: Pages project → **Custom domains** → thêm `www.thodung.co` (và `thodung.co`).

Mỗi lần push lên `main`, Cloudflare tự deploy lại.

## Bật form liên hệ / đặt lịch

Form gửi về `/api/lead`. Cần cấu hình **ít nhất một** kênh nhận trong
Pages project → **Settings** → **Variables and Secrets** (đặt cho Production), rồi deploy lại. (Biến cho trang tra cứu đơn xem mục "Tra cứu đơn hàng" bên dưới.)

| Kênh | Biến | Ghi chú |
|---|---|---|
| Telegram (khuyên dùng) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Tạo bot qua @BotFather, thêm bot vào nhóm, lấy chat id |
| Webhook | `LEAD_WEBHOOK_URL` | Google Apps Script ghi vào Google Sheets, hoặc Make/Zapier |
| Email (Resend) | `RESEND_API_KEY`, `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM` | Cần xác minh tên miền gửi trên resend.com |

Khi chưa cấu hình, form báo lỗi và hiển thị hotline + email để khách liên hệ trực tiếp (không giả vờ gửi thành công).

## Chạy thử trên máy

```bash
npx wrangler pages dev .          # có cả API /api/lead
# hoặc chỉ xem giao diện:
python3 -m http.server 8080
```

Thử form khi chạy local: chép `.dev.vars.example` thành `.dev.vars` và điền biến.

## Việc cần làm trước khi công bố

- [x] Tên miền chính: `https://www.thodung.co` (canonical, Open Graph, sitemap, robots, JSON-LD). Nên đặt `thodung.co` chuyển hướng 301 về `www`.
- [x] Hotline và Zalo: 0983 05 09 05 (nút Zalo dùng `https://zalo.me/0983050905`).
- [x] Pháp nhân giữ nguyên: Công ty TNHH TM DV Đắc An. Thương hiệu: Thợ Đúng. Email giữ nguyên: phuong@dacanco.com.
- [ ] Xác nhận danh mục dịch vụ tại nhà (tủ lạnh, máy giặt, máy nước nóng, máy lọc nước, tivi, bếp…).
- [ ] Bổ sung tên thương hiệu của logo khách hàng chữ "R" (đang để alt "Logo khách hàng chữ R").
- [ ] Bổ sung nếu có: mã số thuế, chính sách bảo hành sau dịch vụ, bảng giá, ảnh công trình thực tế.

## Tra cứu đơn hàng (`/tra-cuu/`)

Khách nhập **mã đơn hàng** và **3 số cuối số điện thoại**. Website gọi `/api/tra-cuu` (`functions/api/tra-cuu.js`). API này gọi một Google Apps Script gắn vào file Google Sheets đơn hàng, và script chỉ trả về **đúng 1 đơn khi khớp cả 2 thông tin**.

- File Sheets vẫn để riêng tư, không chia sẻ công khai.
- Không bao giờ trả về tên, số điện thoại, địa chỉ hay ghi chú nội bộ. Khách chỉ thấy: mã đơn, trạng thái, ngày đơn hàng, ngày lắp đặt, tỉnh, dịch vụ (nếu sheet có các cột này) và cột "Ghi chú cho khách" (nếu bạn tạo).
- Nhập sai 5 lần cho cùng 1 mã đơn thì mã đó bị khóa tra cứu 15 phút.

### Cài đặt (làm 1 lần)

1. **Kiểm tra sheet.** Mỗi sheet cần có cột tiêu đề **Mã đơn hàng** và **SDT** (hoặc "Số điện thoại"). Nên có thêm "Trạng thái lắp đặt", "Ngày đơn hàng", "Ngày lắp đặt", "Tỉnh". Danh sách tên cột được chấp nhận nằm ở `CONFIG.COLS` trong script, thêm tên khác vào đó nếu cần.
2. **Dán script.** Mở file Google Sheets → *Tiện ích mở rộng* → *Apps Script* → xóa nội dung mẫu → dán toàn bộ `google-apps-script/TraCuuDonHang.gs` → kiểm tra dòng `SHEETS: ['KH1', 'KH2']` đúng tên 2 sheet (sheet ưu tiên đặt trước) → Lưu.
3. **Đặt khóa bí mật.** Trong Apps Script: *Cài đặt dự án* (bánh răng) → *Thuộc tính tập lệnh* → *Thêm*: tên `TRACK_KEY`, giá trị là một chuỗi ngẫu nhiên dài (ví dụ 40 ký tự chữ và số).
4. **Kiểm tra.** Chọn hàm `kiemTraCauHinh` → *Chạy* → cấp quyền → xem *Nhật ký thực thi*. Mỗi sheet phải báo ✅ và nhận được cột `code` và `phone`.
5. **Triển khai.** *Triển khai* → *Tùy chọn triển khai mới* → loại *Ứng dụng web* → *Thực thi dưới tên*: **Tôi** → *Người có quyền truy cập*: **Bất kỳ ai** → *Triển khai* → sao chép URL kết thúc bằng `/exec`.
   (Phải chọn "Bất kỳ ai" để Cloudflare gọi được. Script từ chối mọi yêu cầu không có `TRACK_KEY`, nên người ngoài không xem được dữ liệu.)
6. **Khai báo trên Cloudflare.** Pages project → *Settings* → *Variables and Secrets* (Production): `TRACK_SCRIPT_URL` = URL `/exec` ở bước 5, `TRACK_KEY` = khóa ở bước 3 (chọn loại *Secret*) → deploy lại.
7. Mở `https://www.thodung.co/tra-cuu/` và thử với một đơn thật.

Khi sửa script sau này: *Triển khai* → *Quản lý triển khai* → sửa (bút chì) → *Phiên bản mới* → *Triển khai*. URL giữ nguyên.

Có thể gửi link điền sẵn mã đơn cho khách: `https://www.thodung.co/tra-cuu/?ma=MÃĐƠN`.

### Trạng thái hiển thị

Trang tự đọc chữ trong cột trạng thái và hiện thanh tiến trình 4 bước (Tiếp nhận → Hẹn lịch → Đang lắp → Hoàn tất):

| Chữ trong sheet có chứa | Hiển thị |
|---|---|
| "Thành công", "Hoàn thành", "Đã lắp" | Hoàn tất (xanh lá) |
| "Thất bại", "Chưa thành công" | Dừng ở bước Đang lắp, báo sẽ hẹn lại (cam) |
| "Không có nhu cầu", "Hủy", "Từ chối" | Đơn đã đóng (xám, không có thanh tiến trình) |
| "Đang…" | Đang lắp đặt |
| "Hẹn", "Phân công", "Điều phối", "Xác nhận", "Chờ lắp" | Hẹn lịch lắp |
| Trống hoặc khác | Tiếp nhận đơn |

Chữ trạng thái gốc trong sheet luôn hiện nguyên văn trên nhãn.

## Cập nhật CSS/JS/ảnh trùng tên

Trình duyệt lưu tạm file trong `assets/`. Mỗi khi sửa `style.css`, `main.js` hoặc thay một ảnh mà giữ nguyên tên file, hãy đổi số phiên bản `?v=20261105` trong `index.html`, `dich-vu/index.html`, `404.html` (và `site.webmanifest` nếu đổi icon) sang số mới, ví dụ ngày sửa. Ảnh mới đặt tên mới thì không cần.

## Nhận diện thương hiệu

- Logo: `assets/img/logos/thodung*.png|webp` (ngang màu, ngang trắng, dấu D-check), favicon và app icon trong `assets/img/`.
- Slogan: *Đụng việc gì – Đúng thợ đấy*.
- Màu theo logo mới, khai báo trong `:root` của `assets/css/style.css`: xanh `#1456D9`, mực `#0F1B2D`.

## Nguồn nội dung

Toàn bộ số liệu và cam kết lấy từ *Hồ sơ năng lực Thợ Đúng 2026*.
Logo khách hàng, đối tác và ảnh công trình được trích trực tiếp từ hồ sơ này.
