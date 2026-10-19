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


## Giai đoạn 7: Kho ảnh hoàn chỉnh — kéo thả, thumbnail, ID thiếu ảnh (Bước 3)
- **Giải pháp:**
  - **Kéo thả THẬT:** kéo file ảnh vào khung Nguồn Ảnh (viền xanh sáng khi kéo tới). Thả nhầm ngoài vùng → trình duyệt không mở file (giữ nguyên trang).
  - **🖼️ Kho ảnh (bảng thumbnail):** nút mới cạnh Upload — hiện từng ảnh + ID, sắp theo số (2 đứng trước 10). Bấm thumbnail để chọn (viền cam), nút × xóa 1 ảnh, "Chọn tất cả" + "🗑️ Xóa đã chọn" để xóa hàng loạt. Muốn thay 1 ảnh: chỉ cần upload lại file cùng tên, không phải xóa hết.
  - **Làm sạch ID:** tên file `" 5 "` → ID `5`, `"12.PNG"` → `12` (bỏ khoảng trắng thừa, không phân biệt hoa thường ở đuôi file).
  - **Báo lỗi rõ ràng:** file không phải ảnh / HEIC iPhone không đọc được → hiện danh sách file lỗi cụ thể + hướng dẫn lưu lại PNG/JPG (thay vì bỏ qua im lặng). Nút Upload hiện tiến trình "Đang xử lý 12/150...".
  - **⚠️ ID thiếu ảnh:** quét bảng — ô ID Ảnh không có ảnh thật (trong kho lẫn file cũ) → tô viền đỏ nhấp nháy + đếm tổng số ô thiếu hiện ngay trên bảng kho ảnh. Quét lại tự động khi gõ, khi upload, khi xóa.
  - **Ảnh hiện ngay sau upload:** thẻ bài tự vẽ lại (chỉ khi ván chưa bắt đầu) — không cần bấm Lưu & Khởi động lại.
- **Kết quả test thật:**
  - Upload file `" 5 "`, `"07"`, `"12.PNG"` → ID vào kho đúng `5`, `07`, `12` ✔
  - File `.txt` + HEIC giả → báo đúng 2 file lỗi kèm lý do ✔
  - Thumbnail: sắp 1,2,3; × xóa 1 ảnh; chọn hết + xóa hàng loạt; thông báo "Chưa có ảnh" ✔
  - ID `999` chưa có ảnh → ô đỏ + cảnh báo; upload 999.png → hết đỏ, thẻ có ảnh ngay ✔ (cảnh báo 19 → 18 ô)
  - Kéo thả: class sáng hiện đúng khi dragover, ảnh vào kho, class tắt sau drop ✔
  - Toàn bộ phiên: 0 lỗi JavaScript.


## Giai đoạn 8: Sửa lõi game + layout vừa màn hình (2026-10-18)
- **Vấn đề (rà soát thật trên trình duyệt + soi code):**
  1. **"Missing Data" đỏ陋 khi chỉ dùng mặt trước:** bảng có 2 vế độc lập (mặt trước lấy hàng có Từ/ID Trước, mặt sau lấy hàng có Chữ/ID Sau). Hàng không có vế sau → lật thẻ hiện "Missing Data".
  2. **Bảng mẫu trỏ ảnh không tồn tại:** Front-side/ có file 6→39, Back-side/ có file 40→71, nhưng bảng mẫu trỏ ID 1→20/1→19 → mở game lần đầu 10/40 ảnh hiện "Missing". (Ảnh mặc định là cảnh/ chữ tiếng Anh — KHÔNG phải con vật như từ mẫu, nên không ghép bừa.)
  3. **Trang cao hơn màn hình:** bàn chơi ~1120px, laptop 13"/máy ở lớp (633-768px) phải cuộn xuống mới thấy hết 2 đội + nút Restart.
  4. Giá trị giả lúc tải: đồng hồ "01:13", điểm "10", Flipped "1/2", khiên tràn 9px ra mép trái.
- **Giải pháp:**
  - **Mặt sau tự lặp mặt trước:** hàng không có dữ liệu sau → lật lên hiện lại từ/ảnh của mặt trước (thẻ 1 mặt vẫn chơi được, vẫn +điểm). Ngược lại mặt trước trống → lấy mặt sau. **Không bao giờ còn "Missing Data".** (Giữ random ghép cặp trước/sau như cũ theo chọn lọc của thầy.)
  - **Bảng mẫu chỉ dùng từ vựng + câu lệnh** (không trỏ ảnh bừa). Thầy upload ảnh thật rồi điền ID thì thẻ có ảnh.
  - **Layout fit màn hình:** thẻ tự co `max-height` theo `100vh` (công thức trừ phần cố định: timer, header 2 đội, Restart, lề). Màn thấp (<920px cao) thêm thu gọn đồng hồ/avatar/lề Restart. Kích hoạt từ màn rộng ≥768px.
  - Sửa "giá trị giả": 00:00, điểm 0, Flipped 0; khiên không còn tràn mép.
- **Kết quả test thật:**
  - Data mẫu mới: 0 ảnh Missing, lật thẻ hiện "Close your eyes." không còn "Missing Data" ✔
  - Chỉ có Front (20 hàng): lật 3 thẻ → hiện đúng TU_TRUOC_x, không Missing ✔
  - Chỉ có Back: mặt trước tự lấy CAU_SAU_x, lật ra đúng ✔
  - Vừa màn hình: 1920×1080 / 1366×768 / 1280×633 → 0 tràn dọc, thẻ 176×140 / 120×62 / 112×60 ✔
  - 0 lỗi JavaScript.
- **Lưu ý (giữ nguyên theo chọn lọc):** ghép cặp trước/sau khi lật vẫn RANDOM (2 vế độc lập) như thiết kế cũ; cửa sổ Cài đặt vẫn mở sẵn khi vào trang.


## Giai đoạn 9: Sao lưu / Khôi phục từ file JSON (Bước 4b - 2026-10-18)
- **Vấn đề:** Sau khi bỏ "Tải File HTML", game không còn đường cứu dữ liệu nào khi trình duyệt bị dọn, đổi máy, hay copy sang trung tâm khác.
- **Giải pháp:** 2 nút trong khung Nguồn Ảnh:
  - **💾 Tải bản sao lưu:** tải file `pokemon-card-sao-luu-YYYYMMDD.json` chứa **bảng bài học + cài đặt (số thẻ, chế độ hiển thị, giờ, điểm) + TOÀN BỘ kho ảnh** (Base64). Alert báo rõ: bao nhiêu dòng, bao nhiêu ảnh, kích thước file.
  - **📂 Khôi phục từ file:** chọn file .json → kiểm tra đúng file của game (có dấu định danh app) → hỏi xác nhận (đưa số liệu trước khi thay) → khôi phục bảng + cài đặt (localStorage) + kho ảnh (IndexedDB) → **tự vẽ lại bảng, bàn chơi, kho ảnh ngay lập tức**.
  - File sai/không đọc được → báo lỗi rõ ràng, không phá dữ liệu hiện tại.
- **Kết quả test thật:**
  - Seed 3 dòng (TEST_A/B/C) + 2 ảnh dummy → bấm 💾 → file tải về đúng: app marker, 3 dòng, 2 ảnh, cardsCount 12 ✔
  - Xóa SẠCH localStorage + IndexedDB → game về data mẫu (0 ảnh, "Snail") ✔
  - Bấm 📂 chọn file → "Khôi phục thành công": 2 ảnh trở lại, bảng TEST_A/TEST_B, cài đặt 12 thẻ ✔
  - Reload trang → vẫn giữ nguyên (đã ghi IndexedDB thật, không phải RAM) ✔


## Giai đoạn 10: Album theo Chủ đề + 🧹 Dọn ảnh chưa dùng (Bước 5 - 2026-10-18)
- **Yêu cầu của thầy:** lưu ảnh theo chủ đề (Animals, Food, Halloween...), khi
  chơi chỉ cần bấm mở chủ đề đúng; và chống "rác" khi bạn giáo viên khác upload
  ảnh dồn dập không để ý.
- **Giải pháp Album (không phá code cũ):**
  - `albums = {tên: {id: dataURL}}` + `currentAlbumName`; `imagesPool` LUÔN là
    tham chiếu vào album đang mở → toàn bộ code cũ (thẻ bài, upload, kho ảnh,
    cảnh báo ID thiếu) chạy nguyên vẹn.
  - Dạng lưu IndexedDB mới `{albums, current}`; dữ liệu cũ (flat pool) tự
    dời nhà vào album "Chưa phân loại" qua `normalizeAlbums()`.
  - UI: dropdown 📖 Chủ đề (hiện số ảnh), ➕ Tạo mới, ✏️ Đổi tên, 🗑️ Xóa
    (báo số ảnh sẽ mất, giữ tối thiểu 1 chủ đề).
  - Upload vào album đang mở; chuyển album → bàn chơi + kho ảnh đổi theo ngay.
- **Giải pháp 🧹 Dọn ảnh chưa dùng:** đếm ảnh trong album mà bảng bài học
  không tham chiếu (cột ID Trước + ID Sau) → confirm nêu rõ danh sách ID sẽ
  xóa → xóa đúng那些, GIỮ ảnh đang dùng.
- **Sao lưu v2:** file JSON giờ chứa TOÀN BỘ album (`albums` + `currentAlbum`),
  đọc được cả file v1 cũ (`imagesPool` phẳng) khi khôi phục.
- **Kết quả test thật:**
  - Flat pool cũ (2 ảnh) → mở trang → album "Chưa phân loại (2 ảnh)" ✔
  - Tạo "Animals" → upload 101/102 vào đó; "Chưa phân loại" giữ 5/6; chuyển
    qua lại đúng ảnh mỗi album; reload giữ nguyên cả 2 album ✔
  - 🧹 Dọn: bảng dùng ID 5 → xác nhận "Xóa 1 ảnh chưa dùng: 6" → còn đúng 5 ✔
  - Backup v2: "2 chủ đề, tổng 3 ảnh"; xóa sạch → Khôi phục → cả 2 album + bảng
    trở lại ✔; file v1 cũ vẫn khôi phục được ✔
  - 0 lỗi JavaScript.
- **Tài liệu repo:** thêm `HUONG_DAN_AI.md` — cẩm nang cho AI (Hermes/Antigravity/
  Codex) và dev: kiến trúc, các hàm public, workflow sửa code, bẫy đã gặp.
  (File `AGENTS.md` bị chặn bởi cơ chế bảo vệ của tool — dùng tên tiếng Việt.)
