# 🐞 BUG — POKEMON CARDS CLASH

> Ghi **mọi lỗi phát hiện được** (lỗi thầy báo + lỗi em tự phát hiện khi test) vào đây.
> Mục đích: sau này mở ra là thấy ngay lỗi gì, ở đâu, sửa thế nào — khỏi mất công tìm lại.
>
> **Cách ghi:** thêm 1 dòng vào bảng, đánh số tăng dần. Trạng thái: ⬜ mở · 🔨 đang sửa · ✅ đã sửa (có ngày).

---

## Bảng lỗi

| # | Ngày | Task/Lô | Mô tả lỗi (thầy nói / em thấy) | Nơi gây lỗi (file - hàm) | Cách sửa | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | 2026-10-22 | Lô 1 | **Bản trước (không phải lỗi mới):** cấu hình 20 thẻ/lượt ở màn 1280×633 bị tràn thanh cuộn **48px** | `css/style.css` — khối FIT MÀN HÌNH + lề các khối ngoài thẻ | Bù lề bảng thẻ/restart/panel + sàn chiều cao thẻ `105px→92px` | ✅ |
| 2 | 2026-10-22 | Lô 1 | Avatar artwork to hơn làm header cao thêm **36px** → có nguy cơ tràn màn hình | `index.html` + `css/style.css` + `js/game.js` (renderBoard) | Gọn lề bảng thẻ `pt-8→pt-4`, chân trang `pb-6→pb-4`, nút RESTART `py-3→py-1.5`, padding header/panel | ✅ |
| 4 | 2026-10-22 | Task 8 | Mở hộp **Kết thúc** (`triggerWinCelebration`) làm trang bị tràn **53px** — banner `🏆 ... WINS!` vốn là `position:fixed` nhưng CSS của nó ép `display:block` → thành khối thường đẩy bàn chơi xuống | `css/style.css` (`#global-status`) + `js/game.js` (`triggerWinCelebration`) | Tách lớp phủ `.status-overlay` (fixed, z-45, nội dung căn giữa) khỏi bản in-flow; bấm RESTART phải gỡ class này | ✅ 2026-10-22 |
| 5 | 2026-10-22 | Task 3 | **Lỗi có sẵn từ trước:** đồng hồ đếm ngược hiện ra lúc lật thẻ đầu tiên (`startGameGlobalTimer` → bỏ class `hidden`) làm trang tràn **53px** — bản cũ cũng bị, nay mới bị phát hiện khi test kỹ | `index.html` (khối `#game-timer-container`) + `css/style.css` | Chuyển đồng hồ vào trong `#game-toolbar` (dãn `3.5rem→2.75rem`, margin 0) → không còn chiếm chiều cao trang; đã test lúc đồng hồ đang chạy: 0 tràn | ✅ 2026-10-22 |
| 3 | 2026-10-22 | Lô 1 (quy trình test) | Khi đổi số thẻ rồi đo **ngay**, layout còn vỡ (thẻ bị đầy chiều ngang) — **Tailwind CDN cần ~1s để sinh class mới** | quy trình test | Sau khi đổi `CARDS_PER_TEAM` → đợi ~1–1,5s rồi mới đo | ✅ (bẫy, đã ghi lại) |

---

## Lỗi đã biết / bẫy từng gặp (đừng mắc lại)

> Trích từ `HUONG_DAN_AI.md` — đọc kỹ trước khi sửa code.

1. **Không bao giờ hiện "Missing Data"** khi lật thẻ (xem `poolOnlyIds` trong `renderBoard`).
2. **Không reintroduce "Tải File HTML"** — thầy đã bỏ tính năng này (file xuất không nhúng được game.js).
3. **`imagesPool` là tham chiếu** — chỉ mutate tại chỗ (`imagesPool[id] = ...`), không bao giờ gán lại `imagesPool = {...}` (mất hết ảnh album).
4. **Bump `?v=N` sau mọi lần sửa** (3 chỗ trong index.html) — không bump = trình duyệt vẫn chạy code cũ.
5. **Không xóa block CSS `FIT MÀN HÌNH`** — mất là bàn chơi tràn thanh cuộn trên laptop.
6. **`let` toàn cục không gắn vào `window`** — khi test gọi thẳng tên biến, không qua `window.xxx`.
7. **Zalo/riền chặn localStorage** → mọi chỗ lưu phải qua `SafeStore`, không dùng `localStorage` trực tiếp.
8. **Trình duyệt test dễ bị "chim sẻ"**: tab bị session/task khác giành mất hoặc tự về `about:blank`
   giữa chừng → test dở dang ra kết quả sai (vd `initGame is not defined`). **Cách này đã ăn tiền:**
   chạy test với **trình duyệt phiên riêng** (`session="pokemon-clash"`), mỗi lần mất tab thì
   `ensure_real_tab()` + mở lại URL + `Network.setCacheDisabled` trước khi đo.
9. **`confirm()`/`prompt()` chặn thread test** — stub `window.confirm = () => true` trước khi bấm nút test.

---

## Nhật ký sửa lỗi

| Ngày | Việc đã làm | Ghi chú |
|---|---|---|
| 2026-10-22 | Tạo file `bug.md` + `plan.md` | Bắt đầu Phase 1 |
| 2026-10-22 | Sửa lỗi #4 (banner kết thúc tràn 53px) + lỗi #5 (đồng hồ đếm ngược tràn 53px — có sẵn từ trước) | Task 3–8 |
| 2026-10-22 | Ghi thêm bẫy: test tràn màn hình phải ở **mọi tình huống** (mới tải · đang chơi có đồng hồ · game over · máy chiếu), không chỉ lúc mới mở trang | Quy trình test |
