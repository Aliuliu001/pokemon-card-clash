# Sửa Layout Chồng Chéo - Input Nhập Ảnh & Chủ Đề

## Mục tiêu
Sửa phần Input nhập ảnh, tạo chủ đề bị chồng chéo lên nhau trong giao diện Settings

## Danh sách công việc

- [x] **Task 1**: Đọc và phân tích code hiện tại phần `#image-pool-dropzone` (dòng 280-307)
- [x] **Task 2**: Sửa layout cho phần "Nguồn Ảnh" - tách header riêng, tránh chồng lên nút
- [x] **Task 3**: Sửa layout cho phần "Chủ đề Album" - tách thành row riêng với flex-wrap
- [x] **Task 4**: Sửa layout cho phần "Upload buttons" - tách thành row riêng
- [x] **Task 5**: Sửa spacing/margin giữa các sections
- [x] **Task 6**: Sửa phần controls (Rải Số, Điền Time, Xóa) - tách instruction riêng
- [x] **Task 7**: Bump version v13 → v14
- [x] **Task 8**: Push lên GitHub
- [x] **Task 9**: Nhắc anh hard-refresh

## Sửa Settings: vừa màn hình & gom phần điểm (anh duyệt 2026-10-24)

- [x] **Task 1**: Review lỗi tràn màn hình, khu vực ảnh và bảng Excel
- [x] **Task 2**: Chia popup thành tiêu đề / nội dung cuộn / nút Lưu-Hủy cố định
- [x] **Task 3**: Gom Điểm cộng, Điểm trừ, Tiến hoá và Âm thanh thành layout gọn
- [x] **Task 4**: Làm 5 ô cài đặt game tự xuống hàng, không cắt chữ
- [x] **Task 5**: Cho bảng Excel có khung riêng, luôn hiện được dữ liệu
- [x] **Task 6**: Test hiển thị và các nút cộng/trừ, lưu/hủy
- [ ] **Task 7**: Tăng version CSS, push GitHub và kiểm tra trang online

## Ghi chú
- Layout hiện tại: flex-col md:flex-row gây chồng chéo khi quá nhiều elements
- Cần tách thành các sections độc lập với khoảng cách rõ ràng
- Không chạm vào phần logic ảnh Pokémon anh đang làm dở trong `js/config.js` và `js/game.js`.
