# 🐞 BUG — POKEMON CARDS CLASH

> Ghi **mọi lỗi phát hiện được** (lỗi thầy báo + lỗi em tự phát hiện khi test) vào đây.
> Mục đích: sau này mở ra là thấy ngay lỗi gì, ở đâu, sửa thế nào — khỏi mất công tìm lại.
>
> **Cách ghi:** thêm 1 dòng vào bảng, đánh số tăng dần. Trạng thái: ⬜ mở · 🔨 đang sửa · ✅ đã sửa (có ngày).

---

## Bảng lỗi

| # | Ngày | Task/Lô | Mô tả lỗi (thầy nói / em thấy) | Nơi gây lỗi (file - hàm) | Cách sửa | Trạng thái |
|---|---|---|---|---|---|---|
| _chưa có_ | | | | | | |

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
8. **`confirm()`/`prompt()` chặn thread test** — stub `window.confirm = () => true` trước khi bấm nút test.

---

## Nhật ký sửa lỗi

| Ngày | Việc đã làm | Ghi chú |
|---|---|---|
| 2026-10-22 | Tạo file `bug.md` + `plan.md` | Bắt đầu Phase 1 |
