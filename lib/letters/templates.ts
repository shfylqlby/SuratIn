import { formatRupiah, formatTanggalIsian } from "@/lib/format";
import type { Kecamatan, Kelurahan, RtUnit } from "@/lib/types";

export interface LetterContent {
  title: string;
  /** Blok "Kepada Yth." untuk surat pengantar ke instansi lain. */
  addressee?: { kepada: string; di: string };
  opening: string;
  rows: Array<[string, string]>;
  body: string[];
}

interface TemplateInput {
  form: Record<string, string>;
  kelurahan: Kelurahan;
  kecamatan: Kecamatan;
  addressee: { kepada: string; di: string } | null;
  /** Surat pengantar RT/RW yang menjadi dasar surat kelurahan. */
  rt: { unit: RtUnit; letterNo: string } | null;
}

type Template = (input: TemplateInput) => LetterContent;

const lower = (v: string | undefined) => (v ?? "").toLowerCase();

const identityRows = (form: Record<string, string>, kecamatan: Kecamatan): Array<[string, string]> => [
  ["Nama", form.nama ?? "-"],
  ["NIK", form.nik ?? "-"],
  ["Tempat, tgl. lahir", form.ttl ?? "-"],
  ...(form.jenis_kelamin ? ([["Jenis kelamin", form.jenis_kelamin]] as Array<[string, string]>) : []),
  ["Pekerjaan", form.pekerjaan ?? "-"],
  ["Alamat", form.alamat ?? "-"],
  ["Kecamatan", form.kecamatan || kecamatan.nama],
];

function dasarRt(rt: TemplateInput["rt"]) {
  return rt ? `Berdasarkan Surat Pengantar RT ${rt.unit.rt_no}/RW ${rt.unit.rw_no} Nomor ${rt.letterNo}.` : null;
}

const closing = "Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.";
const closingPengantar = "Demikian surat pengantar ini dibuat untuk dipergunakan sebagaimana mestinya.";

const templates: Record<string, Template> = {
  sktm: ({ form, kelurahan, kecamatan, rt }) => ({
    title: "SURAT KETERANGAN TIDAK MAMPU",
    opening: `Yang bertanda tangan di bawah ini, Lurah ${kelurahan.nama}, Kecamatan ${kecamatan.nama}, menerangkan bahwa:`,
    rows: [
      ...identityRows(form, kecamatan),
      ["Penghasilan per bulan", formatRupiah(form.penghasilan ?? "0")],
      ["Jumlah tanggungan", `${form.tanggungan ?? "0"} orang`],
    ],
    body: [
      [dasarRt(rt), `Orang tersebut di atas adalah benar warga Kelurahan ${kelurahan.nama}, Kecamatan ${kecamatan.nama}, dan tergolong keluarga tidak mampu secara ekonomi.`]
        .filter(Boolean)
        .join(" "),
      `Surat keterangan ini diberikan untuk keperluan ${lower(form.keperluan)} dan berlaku selama 6 (enam) bulan sejak tanggal diterbitkan.`,
      closing,
    ],
  }),

  domisili: ({ form, kelurahan, kecamatan, rt }) => ({
    title: "SURAT KETERANGAN DOMISILI",
    opening: `Yang bertanda tangan di bawah ini, Lurah ${kelurahan.nama}, Kecamatan ${kecamatan.nama}, menerangkan bahwa:`,
    rows: [...identityRows(form, kecamatan), ["Lama tinggal", `${form.lama_tinggal ?? "0"} tahun`]],
    body: [
      [dasarRt(rt), `Orang tersebut di atas benar berdomisili di alamat tersebut, dalam wilayah Kelurahan ${kelurahan.nama}.`]
        .filter(Boolean)
        .join(" "),
      `Surat keterangan ini diberikan untuk keperluan ${lower(form.keperluan)}.`,
      closing,
    ],
  }),

  penghasilan_ortu: ({ form, kelurahan, kecamatan, rt }) => ({
    title: "SURAT KETERANGAN PENGHASILAN ORANG TUA",
    opening: `Yang bertanda tangan di bawah ini, Lurah ${kelurahan.nama}, Kecamatan ${kecamatan.nama}, menerangkan bahwa:`,
    rows: [
      ["Nama orang tua", form.nama ?? "-"],
      ["NIK", form.nik ?? "-"],
      ["Pekerjaan", form.pekerjaan ?? "-"],
      ["Penghasilan per bulan", formatRupiah(form.penghasilan ?? "0")],
      ["Alamat", form.alamat ?? "-"],
      ["Kecamatan", form.kecamatan || kecamatan.nama],
    ],
    body: [
      [
        dasarRt(rt),
        `Orang tersebut di atas adalah benar warga Kelurahan ${kelurahan.nama} dan merupakan orang tua dari mahasiswa berikut: ${form.nama_mahasiswa ?? "-"}, NIM ${form.nim ?? "-"}, Program Studi ${form.prodi ?? "-"}, ${form.kampus ?? "-"}.`,
      ]
        .filter(Boolean)
        .join(" "),
      `Penghasilan orang tua tersebut sebesar ${formatRupiah(form.penghasilan ?? "0")} per bulan. Surat keterangan ini diberikan untuk keperluan ${lower(form.keperluan)}${form.nama_beasiswa ? ` (${form.nama_beasiswa})` : ""}.`,
      closing,
    ],
  }),

  pengantar_skck: ({ form, kelurahan, kecamatan, addressee, rt }) => ({
    title: "SURAT PENGANTAR",
    addressee: addressee ?? undefined,
    opening: `Yang bertanda tangan di bawah ini, Lurah ${kelurahan.nama}, Kecamatan ${kecamatan.nama}, menerangkan bahwa:`,
    rows: [
      ...identityRows(form, kecamatan),
      ["Agama", form.agama ?? "-"],
      ["Status perkawinan", form.status_perkawinan ?? "-"],
    ],
    body: [
      [dasarRt(rt), `Orang tersebut di atas adalah benar warga Kelurahan ${kelurahan.nama} dan mengajukan permohonan Surat Keterangan Catatan Kepolisian (SKCK).`]
        .filter(Boolean)
        .join(" "),
      `SKCK diperlukan untuk keperluan ${lower(form.keperluan)}${form.instansi_tujuan ? ` pada ${form.instansi_tujuan}` : ""}. Mohon kiranya dapat diberikan pelayanan sebagaimana mestinya.`,
      closingPengantar,
    ],
  }),

  pengantar_keramaian: ({ form, kelurahan, kecamatan, addressee, rt }) => ({
    title: "SURAT PENGANTAR",
    addressee: addressee ?? undefined,
    opening: `Yang bertanda tangan di bawah ini, Lurah ${kelurahan.nama}, Kecamatan ${kecamatan.nama}, menerangkan bahwa:`,
    rows: [
      ["Nama", form.nama ?? "-"],
      ["NIK", form.nik ?? "-"],
      ["Alamat", form.alamat ?? "-"],
      ["Jenis acara", `${form.jenis_acara ?? "-"}, ${form.nama_acara ?? "-"}`],
      ["Tanggal acara", formatTanggalIsian(form.tanggal_acara ?? "")],
      ["Waktu", `${form.jam_mulai ?? "-"} s.d. ${form.jam_selesai ?? "-"}`],
      ["Lokasi", `${form.lokasi ?? "-"} (${form.nama_jalan ?? "-"})`],
      ["Penggunaan jalan", form.penggunaan_jalan ?? "-"],
      ["Perkiraan tamu", `${form.perkiraan_tamu ?? "-"} orang`],
      ["Hiburan", form.hiburan ?? "-"],
      ["Penanggung jawab", `${form.penanggung_jawab ?? "-"} (${form.no_hp ?? "-"})`],
    ],
    body: [
      [dasarRt(rt), `Orang tersebut di atas adalah benar warga Kelurahan ${kelurahan.nama} dan bermaksud menyelenggarakan acara sebagaimana tersebut di atas.`]
        .filter(Boolean)
        .join(" "),
      "Sehubungan dengan hal tersebut, mohon kiranya dapat diberikan izin keramaian sesuai ketentuan yang berlaku.",
      closingPengantar,
    ],
  }),
};

// Templat lama dari sebelum revisi 1 (data surat lama).
templates["pengantar-skck"] = templates.pengantar_skck;

export function renderTemplate(key: string, input: TemplateInput): LetterContent {
  const template = templates[key];
  if (!template) throw new Error(`Templat surat "${key}" tidak ditemukan`);
  return template(input);
}

/** Isi Surat Pengantar RT/RW (PRD revisi 1 §9.1). */
export function renderRtLetter(input: {
  form: Record<string, string>;
  jenisSurat: string;
  unit: RtUnit;
  kelurahan: Kelurahan;
  kecamatan: Kecamatan;
}): LetterContent {
  const { form, unit, kelurahan, kecamatan, jenisSurat } = input;
  return {
    title: "SURAT PENGANTAR RT/RW",
    opening: `Yang bertanda tangan di bawah ini, Ketua RT ${unit.rt_no}/RW ${unit.rw_no}, Kelurahan ${kelurahan.nama}, Kecamatan ${kecamatan.nama}, menerangkan bahwa:`,
    rows: [
      ["Nama", form.nama ?? "-"],
      ["NIK", form.nik ?? "-"],
      ...(form.ttl ? ([["Tempat, tgl. lahir", form.ttl]] as Array<[string, string]>) : []),
      ...(form.pekerjaan ? ([["Pekerjaan", form.pekerjaan]] as Array<[string, string]>) : []),
      ["Alamat", form.alamat ?? "-"],
      ["Keperluan", jenisSurat],
    ],
    body: [
      `Orang tersebut di atas adalah benar warga RT ${unit.rt_no}/RW ${unit.rw_no}, Kelurahan ${kelurahan.nama}, yang kami kenal dengan baik.`,
      `Surat pengantar ini diberikan sebagai dasar pengajuan ${jenisSurat} ke Kelurahan ${kelurahan.nama}.`,
      closingPengantar,
    ],
  };
}
