# Huong dan test Message API bang Postman

## 1. File Postman

- Import file `Message_API.postman_collection.json` vao Postman.

## 2. Cac bien can sua

Sau khi import, vao Collection Variables va dien:

- `baseUrl`: mac dinh la `http://localhost:3000/api/v1`
- `username`: tai khoan dung de dang nhap
- `password`: mat khau cua tai khoan tren
- `otherUserId`: id cua user ban muon nhan tin
- `uploadedFilePath`: de tam, se tu dong cap nhat sau khi upload file

## 3. Thu tu test de nhat

### Buoc 1: chay server

```bash
npm start
```

### Buoc 2: dang nhap

Chay request `Auth/Login`.

Ket qua:
- API tra ve token
- Postman tu dong luu token vao bien `token`

### Buoc 3: kiem tra user hien tai

Chay request `Auth/Me`.

Muc dich:
- xac nhan token hop le
- xem thong tin user dang dang nhap

### Buoc 4: gui tin nhan text

Chay request `Messages/Send Text Message`.

Body dang gui:

```json
{
  "to": "{{otherUserId}}",
  "messageContent": {
    "type": "text",
    "text": "xin chao"
  }
}
```

### Buoc 5: lay danh sach tin nhan moi nhat

Chay request `Messages/Get Latest Messages`.

Muc dich:
- xem message cuoi cung cua tung user co lien quan den user hien tai

### Buoc 6: lay hoi thoai voi 1 user cu the

Chay request `Messages/Get Conversation By User Id`.

Request nay su dung bien `otherUserId`.

## 4. Test gui file

### Buoc 1: upload file

Chay request `Upload/Upload Single File`.

Luu y:
- o key `file`, ban chon file tren may
- sau khi upload thanh cong, Postman tu dong luu duong dan vao bien `uploadedFilePath`

### Buoc 2: gui file message

Chay request `Messages/Send File Message`.

Body se co dang:

```json
{
  "to": "{{otherUserId}}",
  "messageContent": {
    "type": "file",
    "text": "{{uploadedFilePath}}"
  }
}
```

## 5. Neu bi loi

- `403 ban chua dang nhap`: token sai hoac chua login
- `404 nguoi nhan khong ton tai`: `otherUserId` sai
- `400`: request gui len co loi hoac du lieu khong hop le trong qua trinh xu ly

## 6. Goi y test nhanh

- Tai khoan A login, gui message cho B
- Doi `username` va `password` sang tai khoan B
- Login lai
- Chay `Get Latest Messages`
- Chay `Get Conversation By User Id`

Luc do ban se thay du lieu 2 chieu ro nhat.
