# Nhật ký Phát triển & Tối ưu hóa Game (Process Log)

## Giai đoạn 1: Khởi tạo và Tái cấu trúc (Refactoring)
- **Vấn đề ban đầu:** Mã nguồn game được dồn toàn bộ vào một file duy nhất (`game.html`), bao gồm cả HTML, CSS, JavaScript và dữ liệu JSON. Điều này làm mã nguồn trở nên cồng kềnh, khó quản lý và bảo trì.
- **Giải pháp:** Phân tách mã nguồn thành cấu trúc thư mục chuẩn mực:
  - `index.html`: Khung giao diện chính (DOM, TailwindCSS).
  - `css/style.css`: Các CSS tùy chỉnh (hiệu ứng 3D, animation, pháo hoa).
  - `js/config.js`: Biến toàn cục, thông số game, và cấu trúc dữ liệu mặc định.
  - `js/game.js`: Toàn bộ logic trò chơi, xử lý sự kiện, thuật toán tính điểm và lật thẻ.
- **Kết quả:** Code gọn gàng, dễ bảo trì, và sẵn sàng cho các tính năng mới. Đã khởi tạo Git repository để quản lý phiên bản.

## Giai đoạn 2: Phát triển Tính năng Nguồn Ảnh (Image Pool)
- **Vấn đề ban đầu:** Ban đầu game tải ảnh bằng cách trỏ link tới các thư mục cục bộ (`./Front-side/` và `./Back-side/`). Điều này gây khó khăn khi giáo viên muốn chia sẻ game (vì phải đính kèm thư mục ảnh rườm rà).
- **Giải pháp - Phương án 2 (Kéo thả ảnh trực tiếp):** 
  - Tạo tính năng Upload Ảnh vào bộ nhớ tạm (Image Pool).
  - Sử dụng thẻ `<canvas>` để nén ảnh tự động ngay trên trình duyệt, thu nhỏ kích thước xuống tối đa `400px` để tiết kiệm bộ nhớ (vì giới hạn của LocalStorage thường là 5MB).
  - Lưu ảnh dưới dạng mã hóa **Base64** và nhúng trực tiếp vào dữ liệu JSON của bài học.
- **Kết quả:** Giờ đây giáo viên có thể tải lên ảnh thiết kế từ Canva. Game lưu trữ toàn bộ ảnh trực tiếp vào bộ nhớ của mình.

## Giai đoạn 3: Sửa lỗi (Bug Fixing) - Nền đen của ảnh trong suốt
- **Vấn đề phát sinh:** Khi upload ảnh `.png` (có nền trong suốt - transparent background) từ Canva, hệ thống nén ảnh tự động biến phần nền trong suốt thành màu đen ⬛, gây mất thẩm mỹ khi hiển thị trên thẻ bài.
- **Nguyên nhân:** Thuật toán nén ảnh đang dùng định dạng `image/webp`. Dù WebP hỗ trợ trong suốt, nhưng trên một số môi trường hoặc trình duyệt, hàm `canvas.toDataURL()` xử lý không đồng nhất dẫn đến mất kênh Alpha.
- **Cách khắc phục:**
  - Đổi thuật toán nén ảnh sang định dạng gốc là `image/png`. Định dạng PNG đảm bảo 100% giữ được nền trong suốt trên mọi trình duyệt.
  - Tinh chỉnh kích thước tối đa xuống `400px` để cân bằng dung lượng (vì PNG nặng hơn các định dạng khác).
- **Kết quả:** Ảnh trong suốt hiển thị hoàn hảo trên giao diện thẻ bài.

## Giai đoạn 4: Hoàn thiện Tài liệu (Documentation) & Triển khai (Deployment)
- Đã tạo file `.gitignore` để tránh commit rác.
- Đã soạn thảo tài liệu `README.md` cung cấp hướng dẫn đầy đủ từ A-Z cho giáo viên cách tạo bài học và sử dụng game.
- (Đang tiến hành) Hỗ trợ đẩy mã nguồn lên kho lưu trữ GitHub (Repository: `pokemon-card-clash`) để cấu hình GitHub Pages, cung cấp đường link chơi Online trực tiếp.

## Giai đoạn 5: Nén ảnh thế hệ mới — WebP có kiểm tra (Bước 1 lộ trình 100+ ảnh)
- **Vấn đề:** Nén PNG 400px mỗi ảnh ~70-250KB → chạm giới hạn bộ nhớ trình duyệt (~5MB) chỉ sau ~30-35 ảnh. Không thể upload 100+ ảnh.
- **Giải pháp (không đổi thao tác của giáo viên — vẫn xuất PNG/JPG từ Canva rồi Upload như cũ):**
  - Ưu tiên nén sang **WebP** (nhỏ hơn PNG 4-6 lần) ngay trong trình duyệt.
  - **Kiểm tra kênh alpha thật:** đọc từng pixel của ảnh gốc, rồi giải mã lại ảnh WebP vừa nén — vùng nào vốn trong suốt mà bị đục là bỏ WebP, rơi về PNG (giữ trong suốt 100%). Ảnh không có alpha (JPG chụp) → dùng JPEG.
  - Trình duyệt không nén được WebP → tự nhận PNG/JPEG. Ảnh nén ra to hơn file gốc → giữ nguyên file gốc. Không có đường nào mất ảnh hay to hơn cũ.
  - Ghi chú Giai đoạn 3 (nền đen) được giải quyết đúng cách lần này: không phải "cấm WebP", mà vẫn dùng WebP nhưng **kiểm tra alpha thật sau khi nén**, hỏng là rơi về PNG.
- **Kết quả test thật (trình duyệt Chrome):**
  - PNG trong suốt 1000px: 73KB → **13KB** (WebP, góc trong suốt vẫn alpha=0 ✔)
  - PNG trong suốt 3000px: 253KB → **6KB** ✔
  - JPG chụp: 47KB → **7KB** ✔
  - Ảnh nhỏ hơn 400px: nén ra to hơn file gốc → giữ file gốc ✔
  - Test lưới an toàn: giả lập WebP làm đục nền → trả `false` → rơi về PNG ✔
  - 30 ảnh liên tục: 1.6 giây, trung bình **11KB/ảnh** → 150 ảnh ≈ 1.6MB + JSON ~2.1MB (vẫn trong giới hạn 5MB, và Bước 2 sẽ chuyển sang kho lớn hơn nữa).

## Giai đoạn 6: Kho ảnh chuyển sang IndexedDB + chống mất dữ liệu (Bước 2 lộ trình 100+ ảnh)
- **Vấn đề:** Kho ảnh nằm trong localStorage (~5MB). Hết chỗ là game im lặng không lưu → thầy tắt trang là mất ảnh, không cảnh báo. Ngoài ra trình duyệt chặn localStorage (file:// mở trong app Zalo, chế độ riêng tư) làm game chết trắng ngay dòng đầu.
- **Giải pháp:**
  - **IndexedDB (kho lớn):** toàn bộ kho ảnh chuyển sang IndexedDB (nghìn MB). Ví dụ thật: 10GB quota trên máy test.
  - **Tự dời nhà:** ảnh cũ đang trong localStorage được chuyển sang IndexedDB tự động khi mở trang, bản cũ dọn đi. Nếu cả 2 nơi cùng có (trường hợp hiếm) → GỘP, không bỏ bên nào.
  - **SafeStore:** mọi truy cập localStorage bọc try/catch — trình duyệt chặn storage game vẫn chạy bình thường.
  - **Hiện dung lượng:** mục Nguồn Ảnh có thêm dòng `📦 1.6MB / 10.0GB`.
  - **Hết chỗ thật → LA RỎ:** hộp thoại đỏ hướng dẫn xuất file HTML hoặc xóa bớt, thay vì im lặng bỏ qua như trước.
  - **Gõ chữ mượt hơn:** autoSave không còn serialize lại cả kho ảnh mỗi lần gõ (ảnh lưu riêng qua `saveImagesPool()`).
  - **Nạp ảnh trước khi vẽ game:** hàm khởi động chờ `loadImagesPool()` xong mới `initGame()` → thẻ không hiện "Missing" oan.
- **Kết quả test thật:**
  - Upload 150 ảnh → IndexedDB đủ 150 → **reload vẫn 150/150**, hiển thị `150 ảnh | 📦 1.6MB / 10.0GB` ✔
  - Di cư: seed 10 ảnh kiểu cũ vào localStorage → mở trang → 10/10 vào IndexedDB, localStorage tự dọn ✔
  - Chặn localStorage (giống Zalo mở file): game vẫn chạy 40 thẻ, kho ảnh nạp đủ từ IndexedDB ✔
  - Nút Clear ghi đúng vào kho lớn (IDB = 0) ✔
  - 0 lỗi JavaScript trong toàn bộ phiên test.
- **🚨 Phát hiện mới khi test:** File HTML xuất ra **không chứa code game** — nó trỏ ra `js/game.js` ở ngoài, gửi 1 file .html đơn lẻ là mở lên chết. **→ Quyết định: bỏ hẳn tính năng Xuất File HTML** (giáo viên chơi tại lớp qua link, không tải file về copy sang trung tâm khác cho đỡ tốn công). Nút 📥 và toàn bộ code export đã xóa.
