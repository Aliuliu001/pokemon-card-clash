# 📋 PLAN — POKEMON CARDS CLASH

> File này là **bảng điều khiển công việc**. Mọi task phải được ghi ở đây TRƯỚC KHI làm,
> làm xong 1 task là tick `[x]` + ghi ngày. Lỗi phát hiện trong quá trình làm → ghi vào `bug.md`.
>
> **Quy tắc làm việc (thầy yêu cầu):**
> - Mỗi lần chỉ làm **đúng 2 task** (1 lô), xong lô → push lên GitHub → thầy refresh kiểm tra → mới qua lô sau.
> - Trước khi làm bất kỳ task nào: đọc `HUONG_DAN_AI.md` (cẩm nang) + `process.md` (lịch sử).
> - Sau mọi lần sửa code: bump `?v=N` trong `index.html` (3 chỗ) rồi mới push.
> - Thông báo/alert tiếng Việt, giao diện tiếng Anh.

**Cập nhật lần cuối:** 2026-10-22 — **PHASE 1 ĐẦY ĐỦ (Task 1→8) ĐÃ XONG & PUSH** (thầy duyệt 'làm hết mọi bước, không chờ lô')

---

## A. PHASE 1 — HOÀN THIỆN CÁC MỤC HIỆN TẠI *(đang làm)*

### ✅ Bảng theo dõi tiến độ

| Lô | Task | Mô tả ngắn | Trạng thái |
|---|---|---|---|
| **Lô 1** | Task 1 | Avatar Pokémon artwork to rõ (thay sprite nhỏ) | ✅ Xong 2026-10-22 |
| **Lô 1** | Task 2 | Tiến hoá Pokémon theo nấc điểm | ✅ Xong 2026-10-22 |
| **Lô 2** | Task 3 | Gom toàn bộ nút điều khiển vào 1 thanh công cụ | ✅ Xong 2026-10-22 |
| **Lô 2** | Task 4 | Cài đặt gộp 1 bảng phẳng + tách công tắc âm thanh | ✅ Xong 2026-10-22 |
| **Lô 3** | Task 5 | Nhật ký điểm + nút ↶ Hoàn tác | ✅ Xong 2026-10-22 |
| **Lô 3** | Task 6 | Nhắc sao lưu (chưa tải bản sao) | ✅ Xong 2026-10-22 |
| **Lô 4** | Task 7 | Chế độ Máy chiếu (phóng to số/chữ) | ✅ Xong 2026-10-22 |
| **Lô 4** | Task 8 | Màn hình Kết thúc 3 cột + Bảng xếp hạng | ✅ Xong 2026-10-22 |

> Ký hiệu: ⬜ chưa làm · 🔨 đang làm · ✅ xong + đã push · ⚠️ xong nhưng còn lỗi (xem bug.md)
>
> **Ngoại lệ 2026-10-22:** thầy nhắn *"approve all — làm hết tất cả các bước, không cần chờ 2 task"*
> nên Lô 2→3→4 (Task 3–8) được làm liên tục trong 1 lần, gộp chung 1 lần push.

---

### 📌 LÔ 1 — THÂN HÌNH & TIẾN HOÁ *(2 task)*

#### Task 1 — Avatar Pokémon artwork to rõ
- **Vấn đề:** Avatar hiện tại chỉ 56–68px (sprite pixel nhỏ) → học sinh cuối lớp không nhìn thấy,
  có tiến hoá cũng chẳng ai thấy.
- **Cách làm:**
  - `index.html` (2 chỗ avatar team1/team2): đổi `<img>` sang **official-artwork**
    (`.../sprites/pokemon/other/official-artwork/{id}.png` — ảnh to, nét, đã dùng cho card galaxy).
  - Phóng to khung `.team-avatar-box` từ 56/68px lên **~96–112px** (theo màn).
  - CSS `css/style.css`: sửa block `FIT MÀN HÌNH` (`.team-avatar-box`) + công thức
    `max-height` của `.card` để **vẫn không có thanh cuộn dọc ở 1280×633**.
  - Giữ nguyên: hiệu ứng bật/mơm (`avatar-bounce`/`avatar-shake`), khiên 🛡️, confetti.
- **Tiêu chí nghiệm thu:**
  - Avatar thấy rõ từ xa, không vỡ hình, không đè lên chữ "Total Score".
  - 1280×633 / 1366×768 / 1920×1080: **0 thanh cuộn dọc**, 0 lỗi JS console.

#### Task 2 — Tiến hoá Pokémon theo nấc điểm
- **Ý tưởng:** Đội càng nhiều điểm càng "lên cấp", ảnh avatar đổi sang dạng tiến hoá + hào quang.
- **Cách làm:**
  - `js/config.js`: mỗi đội trong `POKEMON_TEAMS` thêm `evos: [{id, name}, ...]` (3 nấc: LV.1 → LV.2 → LV.3).
  - `js/game.js`: hàm mới `updateEvolution(teamKey)` gọi sau mọi lần đổi điểm → đổi `src` artwork + badge LV + glow.
  - Ngưỡng điểm (mặc định **LV.2 = 150đ**, **LV.3 = 400đ**) đặt trong bảng Cài đặt để thầy chỉnh được.
- **Bảng tiến hoá (đã kiểm tra URL artwork đều hoạt động ✔):**
  | Đội | LV.1 | LV.2 | LV.3 |
  |---|---|---|---|
  | PIKACHU | Pikachu (25) | Raichu (26) | Alolan Raichu (10100) |
  | CHARIZARD | Charizard (6) | Mega Charizard X (10034) | Mega Charizard Y (10035) |
  | MEWTWO | Mewtwo (150) | Mega Mewtwo X (10043) | Mega Mewtwo Y (10044) |
  | GARDEVOIR | Gardevoir (282) | Mega Gardevoir (10029) *cần xác minh tên* | — |
  | GENGAR | Gengar (94) | Mega Gengar (10031) *cần xác minh tên* | — |
  | ALOLAN NINETALES / VAPOREON / SHAYMIN / PACHIRISU / VICTINI / TYRANTRUM | dạng hiện tại | *không có dạng tiến hoá* |
  - **Đội không có tiến hoá:** giữ nguyên artwork, vẫn hiện **badge LV.2/LV.3 + hào quang (glow) đổi màu**
    → học sinh vẫn thấy đội mình "lên cấp".
  - Trước khi chốt ID: gọi PokeAPI `/pokemon/{id}` xác minh **tên đúng** của dạng mega/forme (tránh ghép nhầm).
- **Tiêu chí nghiệm thu:**
  - Đổi điểm thấy avatar đổi hình + badge LV nhảy + hiệu ứng glow.
  - Đội không có tiến hoá vẫn hiện LV + glow.
  - Score Settings → Reset về 0 thì LV quay về 1. 0 lỗi JS.

---

### 📌 LÔ 2 — GỌN GIAO DIỆN ĐIỀU KHIỂN *(2 task)*

#### Task 3 — Gom toàn bộ nút điều khiển vào 1 thanh công cụ
- **Vấn đề hiện tại:** nút rải khắp màn hình — RESTART GAME to ở giữa (tốn 1 hàng),
  cụm nút góc dưới trái (⚙️ / Poké Ball / 🔊 / Snorlax), Mimikyu góc dưới phải → mắt phải nhìn 3 chỗ.
- **Cách làm:**
  - Gom thành **1 thanh công cụ duy nhất, đặt giữa dưới** (nền kính mờ, 1 hàng, có chú thích khi rê chuột):
    `⚙️ Settings` · `🎯 Special Cards` · `🔊 SFX` · `🎵 Music` · `📐 Score Range` · `🔄 Restart` · `🏁 End Game`
  - `🔄 Restart` thu nhỏ thành nút trong thanh (bấm ra hộp xác nhận tiếng Việt) — bỏ hàng RESTART to ở giữa.
  - `🏁 End Game` (Mimikyu) đưa vào thanh, bỏ nút tròn lớn fixed góc phải.
  - Giữ nguyên **id** của các nút cũ (`btn-reset`, `btn-settings`, `btn-sound`, `btn-score-settings`,
    `btn-special-mode`, `btn-end-early`) để logic `game.js` không phải sửa nhiều.
- **Tiêu chí nghiệm thu:** mọi nút bấm được, tiếng + hiệu ứng như cũ; màn hình giữa trống trải hơn;
  0 thanh cuộn dọc; 0 lỗi JS.

#### Task 4 — Cài đặt gộp 1 bảng phẳng + tách công tắc âm thanh
- **Vấn đề:** phải mở nhiều hộp con (Settings, Score Range riêng, âm thanh gộp chung 1 nút).
- **Cách làm:**
  - Hợp nhất **Score Range (Snorlax)** vào modal Settings thành **1 bảng phẳng** — thấy tất cả các trường 1 lúc
    (posMin/posMax/negMin/negMax + ngưỡng tiến hoá + số thẻ + thời gian + chế độ hiển thị).
  - Tách âm thanh thành **2 công tắc riêng**: `🔊 Sound effects` và `🎵 Background music`
    (bật/tắt độc lập, nhớ trạng thái bằng SafeStore).
  - Thông báo confirm/alert tiếng Việt, nêu số liệu.
- **Tiêu chí nghiệm thu:** mở 1 lần là thấy đủ cài đặt; chỉnh điểm/âm thanh có hiệu lực ngay;
  reload giữ nguyên lựa chọn; 0 lỗi JS.

---

### 📌 LÔ 3 — AN TOÀN DỮ LIỆU KHI ĐỨNG LỚP *(2 task)*

#### Task 5 — Nhật ký điểm + nút ↶ Hoàn tác
- **Vấn đề:** bấm nhầm nút điểm/SKILL khi đứng lớp → không sửa được, phải chơi lại.
- **Cách làm:** `game.js` giữ mảng `scoreHistory` (đội, ±điểm, loại thẻ, giờ phút);
  mỗi lần áp điểm/đặc biệt → ghi log + hiện dòng nhỏ "TEAM PIKACHU +40 · 10:15" (dạng cuộn, tối đa ~10 dòng gần nhất);
  nút `↶ Undo` hoàn tác lần điểm gần nhất (chạy lại logic điểm tương ứng, không dùng cache).
- **Tiêu chí nghiệm thu:** cộng nhầm → bấm Undo là điểm về đúng như trước; Undo liên tiếp nhiều lần được;
  Undo khi không có lịch sử → báo tiếng Việt "Chưa có gì để hoàn tác".

#### Task 6 — Nhắc sao lưu
- **Vấn đề:** máy dọn/cache là mất hết album ảnh + bài học, thầy phải làm lại.
- **Cách làm:** chấm đỏ/đếm giờ "⚠️ Chưa tải bản sao" hiện trên thanh công cụ sau khi có thay đổi
  (mỗi ~5 phút hiện 1 lần, không làm phiền); bấm là tải ngay file JSON (dùng lại `btn-backup` hiện có);
  sau khi tải ẩn đi và đếm lại.
- **Tiêu chí nghiệm thu:** sửa dữ liệu → hiện nhắc; tải xong → tắt nhắc; backup/restore vẫn đọc được file cũ (v1, v2).

---

### 📌 LÔ 4 — TRÌNH CHIẾU & KẾT THÚC *(2 task)*

#### Task 7 — Chế độ Máy chiếu (Projector mode)
- 1 nút trong thanh công cụ: phóng to số điểm, chữ bảng dữ liệu, nhãn đội; tăng tương phản màu.
- Bật/tắt nhớ trạng thái. Layout vẫn 0 thanh cuộn.

#### Task 8 — Màn hình Kết thúc 3 cột + Bảng xếp hạng
- Game Over: 3 cột (avatar | Correct/Wrong/Special cards | TOTAL SCORE viền vàng) — theo layout thầy đã duyệt.
- Ô nhập tên đội + nút `💾 SAVE SCORE & VIEW RANKING` → bảng xếp hạng lưu theo **tên + ngày**,
  xem lại được qua nhiều buổi (lưu localStorage, có trong file sao lưu JSON).

---

---

### 📸 KẾT QUẢ NGHIỆM THU LÔ 1 (2026-10-22) — ĐÃ PUSH

**Cách làm thực tế (khác 1 chút so dự kiến ở trên):** bảng tiến hoá đặt trong `js/config.js`
dạng `TEAM_EVOLUTIONS` rồi gán thẳng vào `POKEMON_TEAMS[i].evos` — đọc/duyệt dễ hơn là sửa 11 dòng.

**Nghiệm thu thật (trình duyệt thật, 1280×633):**
- ✅ Avatar **68px → 104px**, đổi sang ảnh **official-artwork** (to, nét). 21/21 link ảnh tải thành công
  (gồm cả dạng mega/forme), có dự phòng rơi về sprite nếu link lỗi.
- ✅ Tiến hoá chạy đúng luồng chơi thật: lật thẻ → cộng điểm → **badge LV.2/LV.3 + hào quang xanh/tím + ảnh đổi**
  (Pikachu→Raichu→Alolan Raichu, Charizard→Mega X...); đội không có tiến hoá (Pachirisu...) vẫn hiện badge LV + hào quang.
- ✅ Ngưỡng LV.2/LV.3 chỉnh được trong hộp **CÀI ĐẶT ĐIỂM SỐ** (mặc định 150 / 400), lưu lại qua lần tải trang.
- ✅ Bấm RESTART → điểm 0, về LV.1, tắt hào quang, ảnh về dạng gốc.
- ✅ **0 thanh cuộn dọc** ở cả cấu hình 12 thẻ (của thầy) lẫn 20 thẻ/lượt — bản trước cấu hình **20 thẻ bị tràn 48px**.
- ✅ Thẻ bài 12 thẻ vẫn **144×124** (không nhỏ đi so với bản trước).
- ✅ 0 lỗi JavaScript khi tải và khi chơi; `node --check` sạch; cache-buster `?v=11`.

**Chiều cao bị bù trừ** (để avatar to mà màn hình vẫn vừa): gọn lề bảng thẻ (`pt-8→pt-4`), lề chân trang,
nút RESTART (`py-3→py-1.5`), padding header/panel, và sàn chiều cao thẻ `105px→92px`.

### 📸 KẾT QUẢ NGHIỆM THU LÔ 2 → LÔ 4 (2026-10-22) — ĐÃ PUSH

> Thầy duyệt **"làm hết mọi bước"** → Task 3–8 làm liên tục, gộp 1 lần push (`?v=12`).

**Nghiệm thu thật (trình duyệt thật, 1280×633 / 1366×768, phiên trình duyệt riêng):**

- ✅ **Task 3 — Thanh công cụ 1 chỗ duy nhất:** nút RESTART to ở giữa + cụm nút 2 góc bị gỡ hết,
  gom vào `#game-toolbar` cố định dưới cùng: `⚙️ 📐 🎯 🔊 🎵 📜 📽️ 💾` + `🔄` + `🏁`.
  Đồng hồ đếm ngược cũng chuyển vào đây (xem lỗi #5 trong bug.md — đây là lỗi **có sẵn từ trước**).
  Bật/tắt SFX 🎵📻, Poke Ball 🎯, Lưu/Xóa ảnh → đều bấm được, giữ nguyên id cũ.
- ✅ **Task 4 — Bảng cài đặt phẳng:** hộp Snorlax (Score Range) riêng bị xoá, gộp thành bảng
  📊 ĐIỂM SỐ / TIẾN HOÁ / ÂM THANH ngay trong Settings → thấy hết mọi ô 1 lúc;
  tách **2 công tắc 🔊 hiệu ứng** và **🎵 nhạc nền** + **💻 máy chiếu**, nhớ trạng thái sau khi tải lại;
  hộp Settings **không tự mở nữa khi vào trang** (bản trước mở sẵn, che bàn chơi).
- ✅ **Task 5 — Nhật ký điểm:** mọi lần đổi điểm được ghi (giờ · đội · lý do · tỷ số trước→sau),
  nút `↩ HOÀN TÁC điểm gần nhất` chạy đúng (test: 20 → undo → 0), `🧹 Dọn nhật ký` có hỏi lại tiếng Việt.
- ✅ **Task 6 — Nhắc sao lưu:** badge `⚠️ CHƯA TẢI BẢN SAO` trên thanh công cụ + banner nhỏ phía trên bàn chơi;
  bấm là tải file JSON ngay, sau đó badge tự ẩn. Sao lưu đã **gồm bảng xếp hạng + cài đặt âm thanh/máy chiếu**.
- ✅ **Task 7 — Chế độ Máy chiếu:** bấm `📽️` → phóng to số điểm/chữ bảng + nhãn `P1/P2` thay "Team Pikachu";
  bật/tắt nhớ trạng thái; vẫn **0 thanh cuộn** khi bật.
- ✅ **Task 8 — Màn hình Kết thúc:** banner `🏆 PIKACHU WINS!` + hộp 3 cột
  (avatar HERO + LV | bảng THỐNG KÊ Correct/Wrong/Special/Skip 2 cột | TOTAL SCORE viền vàng),
  ô nhập tên + `💾 SAVE SCORE & VIEW RANKING` + bảng xếp hạng (Tên · Điểm · Ngày) → lưu lại qua nhiều buổi.
- ✅ **0 thanh cuộn dọc** ở mọi tình huống test: mới tải · đang lật thẻ (đồng hồ chạy) · bật máy chiếu ·
  game kết thúc · sau RESTART. Bản trước: đồng hồ đếm ngược xuất hiện làm tràn **53px** (bug.md #5).
- ✅ Thẻ 12 vẫn **144×124**; toolbar cao 50px, cách bảng đội ~21px (không đè);
  `node --check` 2 file sạch; **0 lỗi JavaScript** trong toàn bộ test; `?v=12`.

**Hai lỗi em tự phát hiện + sửa trong lần này (chi tiết trong `bug.md` #4, #5):**
1. Banner kết thúc (fixed→block) đẩy bàn chơi tràn 53px → thêm lớp phủ `.status-overlay` (fixed).
2. Đồng hồ đếm ngược hiện ra lúc chơi → tràn 53px (lỗi **có sẵn**, bản cũ cũng vậy) → chuyển đồng hồ vào thanh công cụ.

---

## B. PHASE 2 — Ý TƯỞNG MỚI *(chưa làm, chờ Phase 1 xong)*

| Mã | Ý tưởng | Mức độ | Trạng thái |
|---|---|---|---|
| B | Chuỗi Combo 🔥 (3–5 thẻ liên tiếp → ×2 ×3) | Nhỏ | ⬜ |
| C | Cửa hàng Kỹ năng 🛒 (dùng điểm mua Khiên/Nhân đôi/Cướp/Đóng băng) | Lớn | ⬜ |
| D | Đố vui nhanh — Ai bấm nhanh hơn 🔔 (2 đội bấm chuông) | Lớn | ⬜ |
| E | Rương bí ẩn 🎁 (mỗi 5 thẻ 1 rương: + điểm hoặc sự kiện) | Vừa | ⬜ |

> Sau khi thầy chọn, sẽ thêm Phase 2 vào bảng task của Phase 1 theo đúng quy tắc 2 task/lô.

---

## C. QUY TẮC NGHIỆM THU CHUNG (mọi task)
1. `node --check js/game.js && node --check js/config.js` → 0 lỗi cú pháp.
2. Mở game thật (Pages/localhost), bấm thật: không "Missing Data", không lỗi console.
3. Layout 1280×633 / 1366×768 / 1920×1080 → **0 thanh cuộn dọc**.
4. Bump `?v=N` (3 chỗ trong index.html) → commit tiếng Việt → push → verify Pages.
5. Tick `[x]` ở bảng theo dõi + ghi lỗi (nếu có) vào `bug.md`.
