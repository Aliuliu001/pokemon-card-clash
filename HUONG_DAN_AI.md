# HUONG_DAN_AI.md — Hướng dẫn cho AI / Nhà phát triển

> File này dành cho BẤT KỲ AI nào (Hermes, Antigravity, Codex, Claude...) hoặc
> người dev mở repo này lần đầu. Đọc hết trước khi sửa code.
> Game: **Pokemon Cards Clash** — game lật thẻ 2 đội cho lớp học (giáo viên
> người Việt, phi kỹ thuật). Toàn bộ UI trong file `index.html` viết tiếng Anh;
> thông báo/alert viết tiếng Việt.

## 1. Kiến trúc repo

```
index.html          — Toàn bộ giao diện (Tailwind CDN + DOM). Có cache-buster ?v=N
css/style.css       — CSS tùy chỉnh (3D flip, modal, hiệu ứng, layout-fit màn hình)
js/config.js        — Biến toàn cục: POKEMON_TEAMS, DEFAULT_JSON_DATA,
                      imagesPool + albums + currentAlbumName (xem mục 3)
js/game.js          — TOÀN BỘ logic (~2400 dòng). Không framework, không build step.
process.md          — Nhật ký phát triển theo giai đoạn (đọc để hiểu lịch sử thay đổi)
Front-side/         — Ảnh mẫu mặt trước (file 6→39)
Back-side/          — Ảnh mẫu mặt sau (file 40→71)
```

- **Không có build step.** Push lên GitHub → GitHub Pages serve thẳng.
- Sau MỌI lần sửa: bump `?v=N` trong `index.html` (3 chỗ: config.js, game.js,
  style.css) rồi mới push. Không bump = trình duyệt cache code cũ.
- Pages cache ~10 phút. Verify bằng cách `curl` file JS từ
  `https://aliuliu001.github.io/pokemon-card-clash/js/...` và grep chuỗi mới.

## 2. Luồng dữ liệu game (đọc kỹ trước khi sửa)

```
Bảng dữ liệu (100 dòng × 5 cột: ID Trước | Từ Trước | ID Sau | Câu Sau | Thời gian)
   │  autoSave() debounce 500ms → SafeStore (localStorage bọc try/catch)
   ▼
loadData() → frontItemsDatabase[] + globalBackItemsDatabase[]
   │         (mỗi thẻ = front ngẫu nhiên + back ngẫu nhiên — CỐ Ý random,
   │          giáo viên đã chọn cách này 2026-10-18, đừng "sửa" thành ghép cặp)
   ▼
renderBoard('team1'|'team2') → 20 thẻ/lượt
   - Mặt sau TRỐNG → cờ isEmptyBack=true → lật lên hiện card galaxy
     (logo Joy + 2 pokemon đội), không bao giờ "Missing Data"
   - Mặt trước TRỐNG → tự lấy mặt sau
```

Quy tắc bất biến:
- **Không bao giờ hiện "Missing Data"** khi lật thẻ (xem `poolOnlyIds` trong renderBoard).
- **Card galaxy (visual đẹp, logic điểm GIỮ NGUYÊN):** khi back trống, `openZoomModal`
  hiện card galaxy (nền tím sao + logo Joy + 2 pokemon PokeAPI) **NHƯNG nút điểm tròn
  + SKIP VẪN HIỆN** (không ẩn). Logic áp điểm/bỏ qua không đổi.
- Data mẫu `DEFAULT_JSON_DATA` KHÔNG được trỏ ID ảnh không tồn tại trong
  Front-side/Back-side. Hiện tại data mẫu không có ảnh (chỉ từ vựng) — cố tình.
- Card grid tự co `max-height` theo `--card-rows` (CSS `@media min-width:768px`)
  để bàn chơi vừa màn hình laptop — đừng xóa block CSS `FIT MÀN HÌNH`.
- `#modal-card-content` có `max-h-[calc(100vh-140px)]` — giữ, không thì tiêu đề
  "…'S TURN" bị cắt trên máy 633px.

## 3. Hệ thống kho ảnh — PHẦN DỄ VỠ NHẤT, đừng xóa lung tung

### 3.1. Ba lớp bộ nhớ

| Lớp | Vai trò | Ghi chú |
|---|---|---|
| `SafeStore` | localStorage bọc try/catch | Zalo/chế độ riêng tư chặn localStorage → game vẫn sống |
| `ImageDB` | IndexedDB (objectStore `pools`) | Chứa hàng GB ảnh Base64 |
| `imagesPool` | **Tham chiếu** tới album đang mở | `imagesPool === albums[currentAlbumName]` LUÔN đúng |

### 3.2. Album theo chủ đề (Bước 5)

```js
// js/config.js
let albums = { 'Chưa phân loại': {}, 'Animals': {} };  // {tênAlbum: {id: dataURL}}
let currentAlbumName = 'Chưa phân loại';
let imagesPool = {};  // TRỎ VÀO albums[currentAlbumName]
```

- **Dạng lưu IndexedDB (key `pokemonClashImages_main`):**
  `{ albums: {...}, current: 'tên' }`
- **Dạng CŨ (trước Bước 5):** flat `{id: dataURL}` → `normalizeAlbums()` tự
  dời nhà thành album 'Chưa phân loại'. KHÔNG xóa hàm này.
- Mọi code cũ dùng `imagesPool[id]` (renderFrontImages, renderBackImages,
  checkMissingImageIds, renderGallery, ingestImageFiles...) chạy đúng theo
  album đang mở mà KHÔNG cần biết gì về albums.
- **CÁC LUẬT:**
  - `imagesPool` là tham chiếu — thay đổi ảnh phải mutate tại chỗ
    (`imagesPool[id] = ...` hoặc `delete imagesPool[id]`), TUYỆT ĐỐI KHÔNG
    gán lại `imagesPool = {...}` (đứt tham chiếu → album mất ảnh).
  - Sau khi đổi danh sách album: gọi `renderAlbumSelect()` + `updatePoolUI()`.
  - Sau khi đổi ảnh: `await saveImagesPool()` (ghi IndexedDB toàn bộ albums).

### 3.3. Nén ảnh (Bước 1)

- Canva chỉ xuất PNG/JPG/SVG — KHÔNG xuất WebP. Game tự nén trong
  `compressImage(file, 400, 0.85)`.
- `verifyAlphaPreserved()` giải mã lại bản WebP: pixel trong suốt ở nguồn mà
  đục ở bản nén → bỏ WebP, fallback PNG/JPEG. ĐỪNG BỎ bước này (ảnh sticker
  mất nền trong).
- Nén to hơn file gốc → giữ file gốc. Không bao giờ mất ảnh.

### 3.4. Sao lưu / Khôi phục (Bước 4b, format v2)

- Nút 💾 tạo file JSON `{app:'pokemon-card-clash', version:2, dataJSON,
  settings, albums, currentAlbum}`.
- Khôi phục: đọc cả v2 (`albums`) lẫn v1 (`imagesPool` flat) qua
  `normalizeAlbums()`. File sai marker `app` → báo lỗi, KHÔNG đụng dữ liệu.

## 4. Workflow sửa code (bắt buộc)

1. **Đọc** phần liên quan trong file này + `process.md` (giai đoạn gần nhất).
2. **Sửa** — giữ nguyên các hàm public: `loadImagesPool`, `saveImagesPool`,
   `normalizeAlbums`, `ingestImageFiles`, `renderGallery`, `deletePoolImages`,
   `checkMissingImageIds`, `refreshBoardsIfIdle`, `autoSave`, `loadData`,
   `renderBoard`, `renderGrid`.
3. **Kiểm tra cú pháp:** `node --check js/game.js && node --check js/config.js`
4. **Test TRÊN TRÌNH DUYỆT THẬT** (mở localhost hoặc Pages, bấm thật):
   - Upload ảnh → reload → ảnh còn nguyên
   - Lật thẻ → không "Missing Data"
   - Sao lưu → xóa sạch (localStorage + IndexedDB) → Khôi phục → everything back
   - Layout: không tràn dọc ở 1280×633 / 1366×768 / 1920×1080
   - Console: 0 lỗi JavaScript
5. **Bump `?v=N`** trong index.html (3 chỗ).
6. **Commit + push** (git message: `feat:` / `fix:` + mô tả tiếng Việt).
7. **Verify Pages live** (curl + grep chuỗi mới, đợi build ~2-5 phút).

## 5. Bẫy đã gặp (đừng mắc lại)

- **`let` toàn cục KHÔNG gắn vào `window`** — test bằng JS gọi `imagesPool`
  trực tiếp, không `window.imagesPool`.
- **Test browser hay tự reset tab** giữa chừng — chia nhỏ: call sync (kích hoạt
  sự kiện) rồi call khác để đọc kết quả; tránh await dài trong 1 call js().
- **`confirm()`/`prompt()` chặn JS** — khi test tự động phải stub
  `window.confirm = () => true` trước khi bấm nút.
- **alert trong loop upload** — dùng `console.error` thay alert cho lỗi lặp.
- **Cấm** reintroduce "Tải File HTML" (đã bỏ 2026-10-18 theo quyết định của
  giáo viên: file xuất ra không nhúng được game.js → gửi 1 file .html là chết).
- **Thầy (chủ repo) phi kỹ thuật** — mọi alert/thông báo phải tiếng Việt, đơn
  giản, nêu rõ số liệu (bao nhiêu ảnh, bao nhiêu MB) và cách xử lý.

## 6. Các tính năng đã hoàn thành (timeline)

| Giai đoạn | Nội dung |
|---|---|
| 1 | Tách cấu trúc file (html/css/config/js) |
| 2 | Tối ưu game cơ bản |
| 3 | Nén WebP kiểm tra alpha (100+ ảnh) |
| 4 | IndexedDB + SafeStore + chống mất dữ liệu |
| 4a | Mặt sau tự lặp mặt trước + data mẫu + layout fit màn hình |
| 4b | Sao lưu / Khôi phục file JSON (v1 + v2) |
| 5 | Album theo chủ đề + 🧹 Dọn ảnh chưa dùng |

Còn mở (chưa làm): Quiz mode, ghép cặp trước/sau có chủ đích (nếu giáo viên
muốn flashcard Hỏi/Đáp đúng cặp thay vì random).
