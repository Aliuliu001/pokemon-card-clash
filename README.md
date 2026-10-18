# Pokemon Cards 🃏

Một dự án minigame giáo dục dạng lật thẻ bài được thiết kế để giúp học sinh học từ vựng, hình ảnh, và câu hỏi một cách trực quan, sinh động. Giáo viên có thể dễ dàng tạo nội dung bài học và chia sẻ cho học sinh dưới dạng 1 đường link duy nhất hoặc 1 file HTML di động.

## 🌟 Tính Năng Nổi Bật

- **Chạy hoàn toàn trên trình duyệt:** Không cần cài đặt, không cần server. Hoạt động trên mọi thiết bị (máy tính, điện thoại, máy tính bảng).
- **Giao diện thân thiện, hiện đại:** Sử dụng TailwindCSS cho giao diện bắt mắt, hiệu ứng 3D lật thẻ bài mượt mà.
- **Tính năng Nguồn Ảnh (Image Pool):** Tải ảnh `.png`, `.jpg` trực tiếp từ máy tính lên game. Hệ thống sẽ tự động nén ảnh dưới định dạng siêu nhẹ (WebP/PNG) để đảm bảo game không bị giật lag và không bị lỗi bộ nhớ trình duyệt. Hỗ trợ hoàn hảo cho ảnh trong suốt (transparent background).
- **Tùy chỉnh đa dạng:** Cho phép thay đổi số lượng thẻ bài, thời gian đếm ngược, và cách thức hiển thị (mặt trước/mặt sau).

## 🚀 Hướng Dẫn Sử Dụng (Dành cho Giáo viên)

### Cách tạo bài học mới:
1. **Chuẩn bị hình ảnh:** Thiết kế hình ảnh trên Canva hoặc tải trên mạng. Lưu ảnh thành các file có tên là số thứ tự (Ví dụ: `1.png`, `2.png`). Nên dùng ảnh nền trong suốt `.png` để hiển thị đẹp nhất.
2. **Nhập ảnh vào game:** Mở game, cuộn xuống mục **Cài đặt (Settings)**. Tại phần **Nguồn Ảnh**, bấm nút `Upload Images` và chọn toàn bộ ảnh bạn đã chuẩn bị.
3. **Thiết lập dữ liệu:** Tại bảng dữ liệu phía dưới, điền thông tin cho từng cặp thẻ bài:
   - **ID Ảnh Trước / ID Ảnh Sau:** Điền số thứ tự của ảnh (Ví dụ: `1`).
   - **Chữ Trước / Chữ Sau:** Điền từ vựng hoặc câu hỏi.
4. **Lưu và Chia sẻ:** Bấm **Lưu & Khởi động lại**. Bài học được lưu ngay trong máy thầy — mở link game là chơi được ngay tại lớp.

### Dành cho người am hiểu kỹ thuật (Sử dụng GitHub Pages):
Nếu bạn muốn lưu trữ game online (chia sẻ qua link `https://...` thay vì gửi file):
1. Đẩy mã nguồn này lên một kho lưu trữ (Repository) trên GitHub của bạn.
2. Bật tính năng **GitHub Pages** trong phần `Settings > Pages` của kho lưu trữ.
3. Gửi đường link GitHub Pages cho người khác. Họ có thể truy cập, thiết lập bài học và sử dụng trực tuyến.

## 🛠 Cấu trúc Thư mục

- `index.html`: File giao diện chính của game.
- `js/config.js`: File cấu hình, lưu trữ cấu trúc dữ liệu mặc định và các biến toàn cục.
- `js/game.js`: File chứa toàn bộ logic hoạt động của game (xử lý hình ảnh, lật thẻ, tính điểm, xuất file).
- `css/style.css`: File chứa các hiệu ứng CSS tùy chỉnh (hoạt ảnh bắn pháo hoa, lật thẻ 3D).
- `Front-side/` & `Back-side/`: Thư mục lưu ảnh thủ công (Phương pháp cũ - Nay đã được thay thế bằng tính năng Upload Images tiện lợi hơn).

## 📄 Bản Quyền
Dự án được tạo ra với mục đích hỗ trợ giáo dục cộng đồng. Có thể tự do chỉnh sửa và phân phối.
