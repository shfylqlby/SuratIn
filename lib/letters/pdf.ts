import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont, type PDFPage, rgb, degrees, LineCapStyle } from "pdf-lib";
import QRCode from "qrcode";
import { appConfig, displayHost, verifyUrl } from "@/lib/config";
import { formatCode, formatTanggal } from "@/lib/format";
import type { LetterContent } from "./templates";

const MM = 72 / 25.4;
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;
const MARGIN = 25 * MM;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.09, 0.09, 0.11);
const MUTED = rgb(0.35, 0.36, 0.38);
const STAMP = rgb(0.1, 0.2, 0.5);
const SIGN_INK = rgb(0.08, 0.12, 0.3);

export interface Signer {
  jabatan: string;
  nama: string;
  /** Kosong untuk penandatangan tanpa NIP (mis. ketua RT). */
  nip: string;
}

export interface LetterPdfInput {
  content: LetterContent;
  letterNo: string;
  issuedAt: Date;
  place: string;
  kop: { pemerintah: string; lines: string[]; alamat: string };
  signer: Signer;
  /** null = tanpa stempel (surat pengantar RT/RW). */
  stamp: { ring: string; center: string } | null;
  /** Hanya diisi saat penerbitan. Tanpa ini (dan tanpa `final`), PDF adalah pratinjau tanpa TTD/stempel/QR. */
  issue?: { verificationCode: string };
  /** Surat sah tanpa QR (surat pengantar RT/RW): bertanda tangan, tanpa watermark pratinjau. */
  final?: { note: string };
}

let fontCache: { regular: Uint8Array; semibold: Uint8Array; bold: Uint8Array } | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "lib", "letters", "fonts");
  const [regular, semibold, bold] = await Promise.all([
    readFile(path.join(dir, "SourceSerif4-Regular.ttf")),
    readFile(path.join(dir, "SourceSerif4-Semibold.ttf")),
    readFile(path.join(dir, "SourceSerif4-Bold.ttf")),
  ]);
  fontCache = { regular, semibold, bold };
  return fontCache;
}

export async function renderLetterPdf(input: LetterPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bytes = await loadFonts();
  const fonts = {
    regular: await doc.embedFont(bytes.regular, { subset: true }),
    semibold: await doc.embedFont(bytes.semibold, { subset: true }),
    bold: await doc.embedFont(bytes.bold, { subset: true }),
  };

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const issued = Boolean(input.issue || input.final);

  doc.setTitle(`${titleCase(input.content.title)} ${input.letterNo}`);
  doc.setAuthor(input.kop.lines.at(-1) ?? appConfig.name);
  doc.setSubject(input.content.title);
  doc.setCreator(appConfig.name);
  doc.setProducer(appConfig.name);
  doc.setCreationDate(input.issuedAt);
  doc.setModificationDate(input.issuedAt);

  let y = drawKop(page, fonts, input.kop);

  // Surat panjang (blok tujuan atau banyak baris data) dirapatkan agar TTD tidak menabrak kaki surat.
  const dense = Boolean(input.content.addressee) || input.content.rows.length > 8;

  // Tujuan surat pengantar (Kepada Yth.)
  if (input.content.addressee) {
    const ax = PAGE_W - MARGIN - 210;
    y -= 18;
    for (const [text, font] of [
      ["Kepada Yth.", fonts.regular],
      [input.content.addressee.kepada, fonts.semibold],
      [`di ${input.content.addressee.di}`, fonts.regular],
    ] as const) {
      y = drawParagraph(page, font, text, ax, y, 210, 11, 15, 0);
    }
    y += 4;
  }

  // Judul & nomor
  y -= dense ? 22 : 30;
  const titleSize = 13;
  const titleW = fonts.bold.widthOfTextAtSize(input.content.title, titleSize);
  page.drawText(input.content.title, { x: (PAGE_W - titleW) / 2, y, size: titleSize, font: fonts.bold, color: INK });
  page.drawLine({
    start: { x: (PAGE_W - titleW) / 2, y: y - 2.5 },
    end: { x: (PAGE_W + titleW) / 2, y: y - 2.5 },
    thickness: 0.8,
    color: INK,
  });
  y -= 16;
  const nomor = `Nomor: ${input.letterNo}`;
  const nomorW = fonts.regular.widthOfTextAtSize(nomor, 11);
  page.drawText(nomor, { x: (PAGE_W - nomorW) / 2, y, size: 11, font: fonts.regular, color: INK });

  // Isi
  const bodySize = dense ? 10.5 : 11.5;
  const leading = bodySize * (dense ? 1.42 : 1.55);
  y -= dense ? 24 : 34;
  y = drawParagraph(page, fonts.regular, input.content.opening, MARGIN, y, CONTENT_W, bodySize, leading, 0);
  y -= 6;

  const labelX = MARGIN + 22;
  const colonX = MARGIN + 160;
  const valueX = colonX + 10;
  for (const [label, value] of input.content.rows) {
    page.drawText(label, { x: labelX, y, size: bodySize, font: fonts.regular, color: INK });
    page.drawText(":", { x: colonX, y, size: bodySize, font: fonts.regular, color: INK });
    const valueFont = label === "Nama" ? fonts.semibold : fonts.regular;
    y = drawParagraph(page, valueFont, value, valueX, y, PAGE_W - MARGIN - valueX, bodySize, leading, 0);
  }

  y -= 8;
  for (const paragraph of input.content.body) {
    y = drawParagraph(page, fonts.regular, paragraph, MARGIN, y, CONTENT_W, bodySize, leading, 28, "justify");
    y -= 6;
  }

  // Blok tanda tangan
  const signX = PAGE_W - MARGIN - 200;
  y -= 18;
  page.drawText(`${input.place}, ${formatTanggal(input.issuedAt)}`, {
    x: signX,
    y,
    size: bodySize,
    font: fonts.regular,
    color: INK,
  });
  y -= leading;
  page.drawText(input.signer.jabatan, { x: signX, y, size: bodySize, font: fonts.regular, color: INK });

  const sigTop = y - 8;
  const sigBottom = sigTop - 74;

  if (issued) {
    drawSignature(page, input.signer.nama, signX + 18, sigTop - 8);
    if (input.stamp) drawStamp(page, fonts, signX - 20, sigBottom + 44, input.stamp);
  } else {
    drawPreviewBox(page, fonts.regular, signX, sigBottom + 8);
  }

  y = sigBottom - 4;
  page.drawText(input.signer.nama, { x: signX, y, size: bodySize, font: fonts.bold, color: INK });
  const nameW = fonts.bold.widthOfTextAtSize(input.signer.nama, bodySize);
  page.drawLine({ start: { x: signX, y: y - 2 }, end: { x: signX + nameW, y: y - 2 }, thickness: 0.6, color: INK });
  y -= leading - 2;
  if (input.signer.nip) {
    page.drawText(`NIP. ${input.signer.nip}`, { x: signX, y, size: 10.5, font: fonts.regular, color: INK });
  }

  // Kaki surat: catatan TTE + QR
  await drawFooter(doc, page, fonts, input);

  if (!issued) drawWatermark(page, fonts.bold);

  return doc.save({ useObjectStreams: false });
}

function drawKop(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  kop: LetterPdfInput["kop"],
) {
  const top = PAGE_H - 18 * MM;
  drawEmblem(page, MARGIN + 4, top - 58);

  const centerX = PAGE_W / 2 + 22;
  let y = top - 12;
  const lines: Array<{ text: string; size: number; font: PDFFont }> = [
    { text: kop.pemerintah.toUpperCase(), size: 13, font: fonts.bold },
    ...kop.lines.map((text, i) => ({
      text: text.toUpperCase(),
      size: i === kop.lines.length - 1 ? 16 : 13.5,
      font: fonts.bold,
    })),
  ];
  for (const line of lines) {
    const w = line.font.widthOfTextAtSize(line.text, line.size);
    page.drawText(line.text, { x: centerX - w / 2, y, size: line.size, font: line.font, color: INK });
    y -= line.size + 4;
  }
  const alamatW = fonts.regular.widthOfTextAtSize(kop.alamat, 9.5);
  page.drawText(kop.alamat, { x: centerX - alamatW / 2, y: y + 1, size: 9.5, font: fonts.regular, color: MUTED });

  const lineY = Math.min(y - 10, top - 72);
  page.drawLine({ start: { x: MARGIN, y: lineY }, end: { x: PAGE_W - MARGIN, y: lineY }, thickness: 2.2, color: INK });
  page.drawLine({
    start: { x: MARGIN, y: lineY - 3.6 },
    end: { x: PAGE_W - MARGIN, y: lineY - 3.6 },
    thickness: 0.6,
    color: INK,
  });
  return lineY - 4;
}

/** Lambang generik (bukan lambang resmi): perisai dengan lembar surat dan bintang. */
function drawEmblem(page: PDFPage, x: number, y: number) {
  const shield = "M 0 0 L 52 0 L 52 34 C 52 50 38 60 26 66 C 14 60 0 50 0 34 Z";
  page.drawSvgPath(shield, { x, y: y + 66, borderColor: INK, borderWidth: 1.6 });
  page.drawSvgPath("M 5 5 L 47 5 L 47 33 C 47 46 36 54 26 59 C 16 54 5 46 5 33 Z", {
    x,
    y: y + 66,
    borderColor: INK,
    borderWidth: 0.6,
  });
  // lembar surat
  page.drawSvgPath("M 15 16 L 32 16 L 37 21 L 37 44 L 15 44 Z", {
    x,
    y: y + 66,
    borderColor: INK,
    borderWidth: 1,
  });
  for (const ly of [26, 31, 36]) {
    page.drawLine({ start: { x: x + 19, y: y + 66 - ly }, end: { x: x + 33, y: y + 66 - ly }, thickness: 0.7, color: INK });
  }
  page.drawSvgPath(star(26, 9.5, 3.4, 1.4), { x, y: y + 66, color: INK });
}

function star(cx: number, cy: number, r: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = ((Math.PI * 2) / 10) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : inner;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(2)} ${(cy + rr * Math.sin(rad)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function wrap(font: PDFFont, text: string, size: number, width: number, firstIndent = 0) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const available = lines.length === 0 ? width - firstIndent : width;
    if (font.widthOfTextAtSize(candidate, size) <= available || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawParagraph(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  width: number,
  size: number,
  leading: number,
  indent: number,
  align: "left" | "justify" = "left",
) {
  const lines = wrap(font, text, size, width, indent);
  lines.forEach((line, i) => {
    const lx = i === 0 ? x + indent : x;
    const lw = i === 0 ? width - indent : width;
    const isLast = i === lines.length - 1;
    if (align === "justify" && !isLast) {
      const words = line.split(" ");
      const wordsW = words.reduce((s, w) => s + font.widthOfTextAtSize(w, size), 0);
      const gap = words.length > 1 ? (lw - wordsW) / (words.length - 1) : 0;
      let cx = lx;
      for (const w of words) {
        page.drawText(w, { x: cx, y, size, font, color: INK });
        cx += font.widthOfTextAtSize(w, size) + gap;
      }
    } else {
      page.drawText(line, { x: lx, y, size, font, color: INK });
    }
    y -= leading;
  });
  return y;
}

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

/** Tanda tangan dummy: goresan kurva yang dibangkitkan dari nama (bukan tanda tangan asli). */
function drawSignature(page: PDFPage, nama: string, x: number, y: number) {
  const rand = seeded(nama);
  let d = "M 0 30";
  let cx = 0;
  const loops = 4 + Math.floor(rand() * 2);
  for (let i = 0; i < loops; i++) {
    const w = 18 + rand() * 12;
    const up = 4 + rand() * 22;
    const down = 32 + rand() * 12;
    d += ` C ${(cx + w * 0.2).toFixed(1)} ${(30 - up).toFixed(1)}, ${(cx + w * 0.9).toFixed(1)} ${(30 - up).toFixed(1)}, ${(cx + w * 0.6).toFixed(1)} ${down.toFixed(1)}`;
    cx += w * 0.75;
  }
  d += ` C ${cx + 20} 20, ${cx + 30} 34, ${cx + 46} 22`;
  page.drawSvgPath(d, {
    x,
    y,
    borderColor: SIGN_INK,
    borderWidth: 1.3,
    borderLineCap: LineCapStyle.Round,
  });
  page.drawSvgPath(`M -4 44 C 40 ${40 + rand() * 6}, 90 ${46 - rand() * 6}, ${cx + 40} 38`, {
    x,
    y,
    borderColor: SIGN_INK,
    borderWidth: 0.9,
    borderLineCap: LineCapStyle.Round,
  });
}

/** Stempel digital generik: lingkaran ganda, teks melingkar, teks tengah. */
function drawStamp(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont; semibold: PDFFont },
  cx: number,
  cy: number,
  stamp: NonNullable<LetterPdfInput["stamp"]>,
) {
  const opacity = 0.82;
  const rOuter = 44;
  page.drawCircle({ x: cx, y: cy, size: rOuter, borderColor: STAMP, borderWidth: 2.2, borderOpacity: opacity });
  page.drawCircle({ x: cx, y: cy, size: rOuter - 4, borderColor: STAMP, borderWidth: 0.7, borderOpacity: opacity });
  page.drawCircle({ x: cx, y: cy, size: 25, borderColor: STAMP, borderWidth: 0.9, borderOpacity: opacity });

  const text = `${stamp.ring.toUpperCase()} • `;
  const r = rOuter - 11;
  const font = fonts.semibold;
  const circumference = Math.PI * 2 * r;
  let size = 6.8;
  while (size > 4.2 && font.widthOfTextAtSize(text, size) + text.length * 0.6 > circumference) size -= 0.2;
  const totalW = font.widthOfTextAtSize(text, size);
  const spacing = (circumference - totalW) / text.length;
  let angle = 0;
  for (const ch of text) {
    const w = font.widthOfTextAtSize(ch, size);
    const mid = angle + w / 2 / r;
    const px = cx + r * Math.sin(angle);
    const py = cy + r * Math.cos(angle);
    page.drawText(ch, {
      x: px,
      y: py,
      size,
      font,
      color: STAMP,
      opacity,
      rotate: degrees((-mid * 180) / Math.PI),
    });
    angle += (w + spacing) / r;
  }

  const lines = stamp.center.split("\n");
  const lineH = 8.5;
  let ty = cy + ((lines.length - 1) * lineH) / 2 - 1;
  for (const line of lines) {
    const s = line.length > 10 ? 6.4 : 8;
    const w = fonts.bold.widthOfTextAtSize(line, s);
    page.drawText(line, { x: cx - w / 2, y: ty, size: s, font: fonts.bold, color: STAMP, opacity });
    ty -= lineH;
  }
  page.drawSvgPath(star(0, 0, 3.2, 1.3), { x: cx, y: cy + 14, color: STAMP, opacity });
  page.drawLine({ start: { x: cx - 13, y: cy - 10 }, end: { x: cx + 13, y: cy - 10 }, thickness: 0.6, color: STAMP, opacity });
}

function drawPreviewBox(page: PDFPage, font: PDFFont, x: number, y: number) {
  page.drawRectangle({
    x,
    y,
    width: 170,
    height: 58,
    borderColor: MUTED,
    borderWidth: 0.6,
    borderDashArray: [3, 3],
  });
  const t = "Tanda tangan & stempel dibubuhkan saat terbit";
  page.drawText(t, { x: x + 8, y: y + 26, size: 7.5, font, color: MUTED });
}

async function drawFooter(
  doc: PDFDocument,
  page: PDFPage,
  fonts: { regular: PDFFont; semibold: PDFFont },
  input: LetterPdfInput,
) {
  const base = 16 * MM;
  const qrSize = 62;
  const qrX = PAGE_W - MARGIN - qrSize;

  page.drawLine({
    start: { x: MARGIN, y: base + qrSize + 10 },
    end: { x: PAGE_W - MARGIN, y: base + qrSize + 10 },
    thickness: 0.4,
    color: MUTED,
  });

  const noteW = CONTENT_W - qrSize - 20;
  if (input.final && !input.issue) {
    drawSmall(page, fonts.regular, input.final.note, MARGIN, base + qrSize - 8, CONTENT_W);
    return;
  }
  if (input.issue) {
    const png = await QRCode.toBuffer(verifyUrl(input.issue.verificationCode), {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 0,
      width: 360,
      color: { dark: "#16171cff", light: "#ffffffff" },
    });
    const img = await doc.embedPng(png);
    page.drawImage(img, { x: qrX, y: base, width: qrSize, height: qrSize });

    let y = base + qrSize - 8;
    y = drawSmall(
      page,
      fonts.regular,
      `Dokumen ini ditandatangani secara elektronik. Periksa keaslian di ${displayHost()}/verifikasi dengan memindai kode QR atau memasukkan nomor surat.`,
      MARGIN,
      y,
      noteW,
    );
    y -= 4;
    page.drawText(`Kode verifikasi: ${formatCode(input.issue.verificationCode)}`, {
      x: MARGIN,
      y,
      size: 8.5,
      font: fonts.semibold,
      color: INK,
    });
    page.drawText(`${displayHost()}/verifikasi/${input.issue.verificationCode}`, {
      x: MARGIN,
      y: y - 12,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
    });
  } else {
    page.drawRectangle({ x: qrX, y: base, width: qrSize, height: qrSize, borderColor: MUTED, borderWidth: 0.6, borderDashArray: [3, 3] });
    page.drawText("QR", { x: qrX + qrSize / 2 - 6, y: base + qrSize / 2 - 3, size: 9, font: fonts.regular, color: MUTED });
    drawSmall(
      page,
      fonts.regular,
      "Pratinjau. Nomor surat, tanda tangan elektronik, stempel, dan kode QR verifikasi dibubuhkan saat surat diterbitkan.",
      MARGIN,
      base + qrSize - 8,
      noteW,
    );
  }
}

function drawSmall(page: PDFPage, font: PDFFont, text: string, x: number, y: number, width: number) {
  for (const line of wrap(font, text, 8, width)) {
    page.drawText(line, { x, y, size: 8, font, color: MUTED });
    y -= 11;
  }
  return y;
}

function drawWatermark(page: PDFPage, font: PDFFont) {
  const text = "PRATINJAU · BELUM SAH";
  const size = 46;
  const w = font.widthOfTextAtSize(text, size);
  const angle = 35;
  const rad = (angle * Math.PI) / 180;
  page.drawText(text, {
    x: PAGE_W / 2 - (w / 2) * Math.cos(rad),
    y: PAGE_H / 2 - (w / 2) * Math.sin(rad),
    size,
    font,
    color: rgb(0.75, 0.2, 0.15),
    opacity: 0.12,
    rotate: degrees(angle),
  });
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
