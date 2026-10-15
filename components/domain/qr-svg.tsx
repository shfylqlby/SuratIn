import QRCode from "qrcode";

/** QR sebagai SVG statis yang dibangkitkan di server. */
export async function QrSvg({ value, className, label }: { value: string; className?: string; label: string }) {
  const svg = await QRCode.toString(value, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#16171c", light: "#ffffff" } });
  return <span role="img" aria-label={label} className={className} dangerouslySetInnerHTML={{ __html: svg }} />;
}
