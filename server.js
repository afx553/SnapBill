// 📦 SnapBill - Express.js Backend
// QR + PDF Invoice Generator + Web Form

const express = require("express");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const invoices = {}; // memory storage

// Generate invoice PDF
function generateInvoicePDF(invoiceId, data) {
  const filePath = path.join(__dirname, `invoice-${invoiceId}.pdf`);
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(20).text("SnapBill Invoice", { align: "center" });
  doc.moveDown();

  doc.fontSize(14).text(`Invoice ID: ${invoiceId}`);
  doc.text(`Date: ${new Date().toLocaleDateString()}`);
  doc.moveDown();

  doc.text(`Customer: ${data.customer}`);
  doc.text(`Amount: ${data.amount} SAR`);
  doc.text(`Details: ${data.details}`);
  doc.end();

  return filePath;
}

// API: Create Invoice
app.post("/api/invoice", async (req, res) => {
  const { customer, amount, details } = req.body;
  const invoiceId = Date.now().toString();
  invoices[invoiceId] = { customer, amount, details };

  const invoiceUrl = `${req.protocol}://${req.get("host")}/invoice/${invoiceId}`;
  const qr = await QRCode.toDataURL(invoiceUrl);

  generateInvoicePDF(invoiceId, invoices[invoiceId]);

  res.json({ invoiceId, invoiceUrl, qr });
});

// Web Form: Render invoice form
app.get("/form", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>إنشاء فاتورة – SnapBill</title>
      <style>
        body { font-family: sans-serif; padding: 20px; max-width: 500px; margin: auto; }
        input, textarea { width: 100%; padding: 8px; margin: 8px 0; }
        button { padding: 10px 20px; }
        #result { margin-top: 20px; }
      </style>
    </head>
    <body>
      <h2>إنشاء فاتورة رقمية</h2>
      <form method="POST" action="/form">
        <label>اسم العميل:</label>
        <input type="text" name="customer" required />
        <label>المبلغ (ر.س):</label>
        <input type="number" name="amount" required />
        <label>تفاصيل:</label>
        <textarea name="details"></textarea>
        <button type="submit">إنشاء الفاتورة</button>
      </form>
      <div id="result">
        ${req.query.success ? `<p>✅ <strong>تم إنشاء الفاتورة</strong></p>
        <p><a href="${req.query.url}" target="_blank">فتح الفاتورة</a></p>
        <img src="${req.query.qr}" width="150" />` : ""}
      </div>
    </body>
    </html>
  `);
});

// Web Form: Handle submission
app.post("/form", async (req, res) => {
  const { customer, amount, details } = req.body;
  const invoiceId = Date.now().toString();
  invoices[invoiceId] = { customer, amount, details };

  const invoiceUrl = `${req.protocol}://${req.get("host")}/invoice/${invoiceId}`;
  const qr = await QRCode.toDataURL(invoiceUrl);

  generateInvoicePDF(invoiceId, invoices[invoiceId]);

  res.redirect(`/form?success=1&url=${encodeURIComponent(invoiceUrl)}&qr=${encodeURIComponent(qr)}`);
});

// API: View Invoice (HTML + Download PDF)
app.get("/invoice/:id", (req, res) => {
  const id = req.params.id;
  const invoice = invoices[id];
  if (!invoice) return res.status(404).send("Invoice not found");

  const pdfUrl = `/invoices/invoice-${id}.pdf`;
  res.send(`
    <h1>فاتورة SnapBill</h1>
    <p><strong>العميل:</strong> ${invoice.customer}</p>
    <p><strong>المبلغ:</strong> ${invoice.amount} ريال</p>
    <p><strong>التفاصيل:</strong> ${invoice.details}</p>
    <a href="${pdfUrl}" target="_blank">📄 تحميل الفاتورة PDF</a>
  `);
});

// Serve PDFs
app.use("/invoices", express.static(path.join(__dirname)));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 SnapBill live on port ${port}`);
});
