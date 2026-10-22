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
- [ ] **Task 8**: Push lên GitHub
- [ ] **Task 9**: Nhắc anh hard-refresh

## Ghi chú
- Layout hiện tại: flex-col md:flex-row gây chồng chéo khi quá nhiều elements
- Cần tách thành các sections độc lập với khoảng cách rõ ràng
