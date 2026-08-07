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
