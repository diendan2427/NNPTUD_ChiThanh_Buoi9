# Message API

## 1. Cac file da them

- `schemas/messages.js`: tao schema cho message
- `routes/messages.js`: viet 3 router cho chuc nang nhan tin
- `app.js`: mount router moi vao `/api/v1/messages`

## 2. Schema message

Schema trong `schemas/messages.js` gom cac truong:

- `from`: user gui tin nhan
- `to`: user nhan tin nhan
- `messageContent.type`: kieu noi dung, chi nhan `file` hoac `text`
- `messageContent.text`: noi dung text hoac duong dan file
- `timestamps: true`: tu dong tao `createdAt` va `updatedAt`

Y nghia cua `messageContent`:

- Neu gui tin nhan van ban:
  - `type: "text"`
  - `text`: noi dung tin nhan
- Neu gui file:
  - `type: "file"`
  - `text`: path cua file, vi du path lay tu API upload cua bai

## 3. Router GET `/api/v1/messages/:id`

Router nay dung de lay toan bo doan chat giua user hien tai va 1 user khac.

Dieu kien truy van:

- `id` chinh la `userID` can lay hoi thoai
- `from = user hien tai` va `to = id`
- hoac `from = id` va `to = user hien tai`

Ket qua duoc sap xep tang dan theo `createdAt` de hien thi dung thu tu hoi thoai.

## 4. Router POST `/api/v1/messages`

Router nay dung de gui tin nhan.

### Du lieu gui len

```json
{
  "to": "id_cua_user_nhan",
  "messageContent": {
    "type": "text",
    "text": "xin chao"
  }
}
```

Neu gui file:

```json
{
  "to": "id_cua_user_nhan",
  "messageContent": {
    "type": "file",
    "text": "uploads/abc123.png"
  }
}
```

Logic cua router:

- Lay `from` tu `req.userId`, khong cho client tu tuyen sender
- Kiem tra `to` co ton tai hay khong
- Luu message vao database va tra ket qua ve
- API tra ve document message dung form schema, khong populate them thong tin user

## 5. Router GET `/api/v1/messages`

Router nay dung de lay **tin nhan cuoi cung cua moi user** da tung nhan tin voi user hien tai.

Logic thuc hien:

- Lay tat ca message ma user hien tai co lien quan (`from = currentUser` hoac `to = currentUser`)
- Sap xep giam dan theo `createdAt`
- Duyet tung message tu moi den cu
- Moi user doi thoai chi lay 1 tin nhan dau tien, vi do chinh la tin nhan moi nhat

Cach lam nay phu hop voi form bai hien tai vi:

- de doc
- de debug
- giong cach viet route don gian cua project
- khong can viet aggregate phuc tap

## 6. Cach goi API nhanh

### Lay lich su chat voi 1 user

`GET /api/v1/messages/:id`

### Gui tin nhan text

`POST /api/v1/messages`

```json
{
  "to": "680000000000000000000001",
  "messageContent": {
    "type": "text",
    "text": "hello"
  }
}
```

### Gui file

Buoc 1: upload file truoc bang API upload cua bai.

Buoc 2: lay path tra ve va gui vao API message:

```json
{
  "to": "680000000000000000000001",
  "messageContent": {
    "type": "file",
    "text": "uploads/1711788888-123456.png"
  }
}
```

### Lay danh sach message cuoi cung cua moi cuoc tro chuyen

`GET /api/v1/messages`
