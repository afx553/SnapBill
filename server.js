// 📦 SnapBill - Express.js Backend
// QR + PDF Invoice Generator

const express = require("express");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

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
