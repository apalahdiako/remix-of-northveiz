import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formatRupiah = (val: number | null | undefined) =>
  val != null ? val.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }) : "-";

const formatDate = (val: string | null | undefined) =>
  val ? new Date(val).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

const safe = (val: any, fallback = "-") => (val != null && val !== "" ? String(val) : fallback);

interface OrderData {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  city: string;
  postal_code: string;
  product_name: string;
  product_price: string;
  product_image: string;
  size: string;
  quantity: number;
  total_amount: number;
  order_status: string;
  payment_method: string;
  tracking_number?: string;
  created_at: string;
}

interface StoreSettings {
  store_name: string;
  store_address: string;
  store_phone: string;
  store_email: string;
  logo_url: string | null;
}

async function fetchOrderAndStore(orderId: string) {
  const [orderRes, storeRes, trackingRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).single(),
    supabase.from("store_settings").select("*").limit(1).single(),
    supabase.from("shipment_tracking").select("*").eq("order_id", orderId).maybeSingle(),
  ]);

  if (orderRes.error) throw new Error("Gagal memuat data order: " + orderRes.error.message);
  const order = orderRes.data as OrderData;
  const store = (storeRes.data || { store_name: "NORTHVEIZ", store_address: "Jakarta, Indonesia", store_phone: "-", store_email: "-", logo_url: null }) as StoreSettings;
  const tracking = trackingRes.data;

  return { order, store, tracking };
}

function parsePrice(priceStr: string): number {
  return Number(String(priceStr).replace(/[^0-9]/g, "")) || 0;
}

export async function generateInvoicePDF(orderId: string) {
  toast.info("Generating Invoice...");
  try {
    const { order, store, tracking } = await fetchOrderAndStore(orderId);
    const doc = new jsPDF();
    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(safe(store.store_name, "NORTHVEIZ"), 14, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    y += 6;
    doc.text(safe(store.store_address), 14, y);
    y += 4;
    doc.text(`Tel: ${safe(store.store_phone)} | Email: ${safe(store.store_email)}`, 14, y);

    // Invoice title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", w - 14, 20, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const year = new Date(order.created_at).getFullYear();
    const invNumber = `INV-${order.order_number}-${year}`;
    doc.text(invNumber, w - 14, 27, { align: "right" });
    doc.text(`Tanggal: ${formatDate(order.created_at)}`, w - 14, 32, { align: "right" });
    doc.text(`Status: ${safe(order.order_status)}`, w - 14, 37, { align: "right" });

    // Divider
    y = 45;
    doc.setDrawColor(200);
    doc.line(14, y, w - 14, y);
    y += 8;

    // Customer info
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Dikirim Kepada:", 14, y);
    doc.setFont("helvetica", "normal");
    y += 5;
    doc.text(safe(order.customer_name), 14, y); y += 4;
    doc.text(safe(order.customer_email), 14, y); y += 4;
    doc.text(safe(order.customer_phone), 14, y); y += 4;
    doc.text(safe(order.shipping_address), 14, y); y += 4;
    doc.text(`${safe(order.city)} ${safe(order.postal_code)}`, 14, y);
    y += 10;

    // Table header
    doc.setFillColor(45, 45, 55);
    doc.setTextColor(255);
    doc.rect(14, y, w - 28, 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Produk", 16, y + 5.5);
    doc.text("Ukuran", 90, y + 5.5);
    doc.text("Qty", 115, y + 5.5);
    doc.text("Harga Satuan", 135, y + 5.5);
    doc.text("Subtotal", w - 16, y + 5.5, { align: "right" });
    y += 10;

    // Table row
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    const unitPrice = parsePrice(order.product_price);
    const subtotal = unitPrice * order.quantity;
    doc.text(safe(order.product_name), 16, y + 4);
    doc.text(safe(order.size), 90, y + 4);
    doc.text(String(order.quantity), 115, y + 4);
    doc.text(formatRupiah(unitPrice), 135, y + 4);
    doc.text(formatRupiah(subtotal), w - 16, y + 4, { align: "right" });
    y += 8;
    doc.setDrawColor(220);
    doc.line(14, y, w - 28 + 14, y);
    y += 8;

    // Totals
    const totalAmount = Number(order.total_amount) || subtotal;
    const ongkir = totalAmount > subtotal ? totalAmount - subtotal : 0;

    doc.setFont("helvetica", "normal");
    doc.text("Subtotal", 130, y); doc.text(formatRupiah(subtotal), w - 16, y, { align: "right" }); y += 5;
    doc.text("Ongkir", 130, y); doc.text(formatRupiah(ongkir), w - 16, y, { align: "right" }); y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL", 130, y); doc.text(formatRupiah(totalAmount), w - 16, y, { align: "right" });
    y += 10;

    // Payment & Shipping
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Metode Pembayaran: ${safe(order.payment_method)}`, 14, y); y += 5;
    if (tracking) {
      doc.text(`Kurir: ${safe(tracking.courier)}`, 14, y); y += 5;
      doc.text(`No. Resi: ${safe(tracking.resi_number)}`, 14, y); y += 5;
    }

    // Footer
    y += 10;
    doc.setDrawColor(200);
    doc.line(14, y, w - 14, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("Terima kasih atas pesanan Anda! — " + safe(store.store_name), w / 2, y, { align: "center" });

    const fileName = `INV-${order.order_number}-${safe(order.customer_name).replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
    toast.success("Invoice berhasil di-download!");
  } catch (err: any) {
    toast.error("Gagal membuat invoice: " + (err.message || "Unknown error"));
  }
}

export async function generateShippingLabelPDF(orderId: string) {
  toast.info("Generating Label...");
  try {
    const { order, store, tracking } = await fetchOrderAndStore(orderId);

    // 100mm x 150mm label
    const doc = new jsPDF({ unit: "mm", format: [100, 150] });
    let y = 8;

    // Sender
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("PENGIRIM:", 5, y);
    doc.setFont("helvetica", "normal");
    y += 4;
    doc.text(safe(store.store_name), 5, y); y += 3;
    doc.setFontSize(6);
    doc.text(safe(store.store_address), 5, y); y += 3;
    doc.text(`Tel: ${safe(store.store_phone)}`, 5, y);
    y += 5;

    // Divider
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(5, y, 95, y);
    y += 5;

    // Recipient
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PENERIMA:", 5, y);
    y += 5;
    doc.setFontSize(11);
    doc.text(safe(order.customer_name), 5, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(safe(order.customer_phone), 5, y);
    y += 5;
    // Wrap address
    const fullAddr = `${safe(order.shipping_address)}, ${safe(order.city)} ${safe(order.postal_code)}`;
    const lines = doc.splitTextToSize(fullAddr, 88);
    doc.text(lines, 5, y);
    y += lines.length * 4 + 3;

    // Divider
    doc.line(5, y, 95, y);
    y += 5;

    // Barcode
    const resiNumber = tracking?.resi_number || order.tracking_number;
    if (resiNumber) {
      try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, resiNumber, { format: "CODE128", width: 2, height: 40, displayValue: true, fontSize: 12 });
        const barcodeImg = canvas.toDataURL("image/png");
        doc.addImage(barcodeImg, "PNG", 10, y, 80, 20);
        y += 24;
      } catch {
        doc.setFontSize(9);
        doc.text(`Resi: ${resiNumber}`, 5, y + 5);
        y += 10;
      }
    } else {
      doc.setDrawColor(180);
      doc.setLineDashPattern([2, 2], 0);
      doc.rect(10, y, 80, 18);
      doc.setLineDashPattern([], 0);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Nomor Resi Belum Diinput", 50, y + 10, { align: "center" });
      doc.setTextColor(0);
      y += 22;
      toast.warning("Label dicetak tanpa nomor resi");
    }

    // Courier & product info
    y += 3;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    if (tracking?.courier) doc.text(`Kurir: ${tracking.courier}`, 5, y);
    y += 4;
    doc.text(`Produk: ${safe(order.product_name)}`, 5, y); y += 3;
    doc.text(`Ukuran: ${safe(order.size)} | Bayar: ${safe(order.payment_method)}`, 5, y);

    const fileName = `LABEL-${order.order_number}-${safe(order.customer_name).replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
    toast.success("Label pengiriman berhasil di-download!");
  } catch (err: any) {
    toast.error("Gagal membuat label: " + (err.message || "Unknown error"));
  }
}
