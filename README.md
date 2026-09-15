# NutriScan AI — Landing Page + ระบบหลังบ้าน (Netlify)

โปรเจกต์นี้พร้อม deploy ขึ้น **Netlify** และมีระบบนับ "ผู้เข้าชมเว็บไซต์" กับ
"คนกดสั่งซื้อ" แบบเรียลไทม์ เก็บข้อมูลด้วย **Netlify Blobs** (ในตัว Netlify
ไม่ต้องตั้งฐานข้อมูลแยก)

## โครงสร้างไฟล์

```
├── index.html                 หน้าแลนดิ้งเพจหลัก (มีสคริปต์ยิง tracking อยู่แล้ว)
├── admin.html                 หน้าหลังบ้าน ดูจำนวนคนเข้าชม/กดสั่งซื้อ
├── netlify.toml                ตั้งค่า build ของ Netlify
├── package.json                ระบุ dependency @netlify/blobs
└── netlify/functions/
    ├── track.mjs               รับการยิง event visit/order แล้วบันทึกลง Blobs
    └── stats.mjs               ให้ admin.html ดึงสถิติ (ต้องใส่รหัสผ่าน)
```

## วิธี Deploy ขึ้น Netlify

### วิธีที่ 1: ลากไฟล์วาง (เร็วที่สุด แต่ต้องอัปเดต Functions เอง)
ไปที่ https://app.netlify.com/drop แล้วลากทั้งโฟลเดอร์นี้วาง — ระบบจะ deploy
ให้ทันที รวมถึง Netlify Functions ในโฟลเดอร์ `netlify/functions`

### วิธีที่ 2: ผ่าน Git (แนะนำ ใช้งานได้ยาวกว่า)
1. สร้าง repo ใหม่บน GitHub แล้วอัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้นไป
2. เข้า Netlify → **Add new site → Import an existing project**
3. เลือก repo ที่สร้างไว้ ปล่อยค่า build ตามที่ตรวจเจอ (publish directory = `.`)
4. กด Deploy

### วิธีที่ 3: Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

## ตั้งค่ารหัสผ่านแอดมิน (สำคัญ ต้องทำก่อนเข้าหน้าหลังบ้านได้)

หน้า `admin.html` จะขอรหัสผ่านก่อนแสดงสถิติ รหัสผ่านนี้มาจาก Environment
Variable ชื่อ `ADMIN_KEY` ที่ต้องตั้งค่าเองใน Netlify:

1. ไปที่ **Site settings → Environment variables**
2. เพิ่มตัวแปรใหม่ ชื่อ `ADMIN_KEY` ค่าเป็นรหัสผ่านที่ต้องการ (ตั้งให้คาดเดายาก)
3. Deploy ใหม่อีกครั้งหนึ่ง (Trigger deploy) เพื่อให้ Function อ่านค่านี้ได้

หลังจากนั้นเข้าเว็บที่ `https://<ชื่อเว็บของคุณ>.netlify.app/admin.html`
แล้วกรอกรหัสผ่านที่ตั้งไว้

## วิธีทำงานของระบบ tracking

- ทุกครั้งที่มีคนเปิดหน้า `index.html` สคริปต์จะยิง `POST /api/track`
  พร้อม `{ type: "visit" }` โดยอัตโนมัติ
- ทุกครั้งที่มีคนกดปุ่ม "สั่งซื้อทันที" / "เลือกแพ็กเกจ Premium" ฯลฯ
  จะยิง `POST /api/track` พร้อม `{ type: "order" }` ก่อนแสดง popup
- `track.mjs` เก็บยอดรวม (`totals`) และ log เหตุการณ์ล่าสุด 100 รายการ
  ลงใน Netlify Blobs (store ชื่อ `stats`)
- `stats.mjs` เป็น endpoint สำหรับหน้า admin ดึงข้อมูลไปแสดง โดยต้องแนบ
  header `x-admin-key` ให้ตรงกับค่า `ADMIN_KEY` ที่ตั้งไว้ ไม่งั้นจะได้ 401

## ข้อจำกัดที่ควรรู้

- ตัวนับเป็นแบบ "รวมทุกคนทุกอุปกรณ์" ไม่ได้แยก unique visitor (ถ้ากด F5
  รัวๆ ก็จะนับเพิ่มทุกครั้ง) — ถ้าต้องการนับ unique visitor แจ้งได้ ทำเพิ่มได้
  โดยเช็ค cookie/localStorage ของผู้ใช้
- ปุ่ม "สั่งซื้อ" ในเดโมนี้ยังไม่ได้ต่อระบบชำระเงินจริง เป็นแค่ตัวจับ
  "ความสนใจสั่งซื้อ" (order intent) เท่านั้น ถ้าต้องการต่อระบบชำระเงินจริง
  (เช่น Omise, 2C2P, Stripe) แจ้งเพิ่มได้
- รหัสผ่านแอดมินที่กรอกจะเก็บไว้ใน localStorage ของเบราว์เซอร์เพื่อไม่ต้อง
  กรอกซ้ำ ถ้าใช้เครื่องสาธารณะ ให้กด "ออกจากระบบ" ก่อนปิดหน้าเว็บ
