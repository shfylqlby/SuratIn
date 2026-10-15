export type UserRole = "warga" | "rt_rw" | "admin_kelurahan" | "camat" | "super_admin";
/** Nilai lama (diajukan, ditolak, menunggu_camat) tetap ada di enum untuk data lama, tidak dihasilkan lagi. */
export type RequestStatus =
  | "menunggu_rt"
  | "ditolak_rt"
  | "menunggu_kelurahan"
  | "ditolak_kelurahan"
  | "terbit"
  | "dibatalkan"
  | "diajukan"
  | "ditolak"
  | "menunggu_camat";
export type ApprovalAction =
  | "submit"
  | "resubmit"
  | "approve_rt"
  | "reject_rt"
  | "approve_kelurahan"
  | "reject_kelurahan"
  | "reject"
  | "sign_camat"
  | "cancel"
  | "issue";
export type DocumentKind = "ktp" | "kk" | "pendukung";

export type FieldType = "text" | "textarea" | "number" | "currency" | "select" | "date" | "time" | "phone";
export type AiStatus = "belum_diperiksa" | "lolos" | "perlu_dicek" | "gagal_diperiksa";
export type OutputKind = "surat_keterangan" | "surat_pengantar";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  readonly?: boolean;
  prefill?: string;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  options?: string[];
  /** date: tanggal minimal hari ini (WIB) + n hari */
  minDaysAhead?: number;
  /** time: harus setelah nilai isian lain */
  after?: string;
}

export interface FormSchema {
  fields: FormField[];
}

export interface RequiredDocument {
  kind: DocumentKind;
  label: string;
  optional?: boolean;
}

export interface Profile {
  id: string;
  role: UserRole;
  nama: string;
  email: string | null;
  nik: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  alamat: string | null;
  pekerjaan: string | null;
  kelurahan_id: string | null;
  kecamatan_id: string | null;
  rt_unit_id: string | null;
  jabatan: string | null;
  nip: string | null;
}

export interface LetterType {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string;
  kode_klasifikasi: string;
  /** Tidak dipakai lagi sejak revisi 1 (camat tidak menandatangani). */
  requires_camat: boolean;
  requires_rt: boolean;
  output_kind: OutputKind;
  addressee: { kepada: string; di: string } | null;
  form_schema: FormSchema;
  required_documents: RequiredDocument[];
  template_key: string;
}

export interface RtUnit {
  id: string;
  kelurahan_id: string;
  rw_no: string;
  rt_no: string;
}

export interface Kelurahan {
  id: string;
  kecamatan_id: string;
  nama: string;
  kode: string;
  alamat_kantor: string;
  kop_nama_lurah: string;
  nip_lurah: string;
}

export interface Kecamatan {
  id: string;
  nama: string;
  kode: string;
  alamat_kantor: string;
  nama_camat: string;
  nip_camat: string;
}

export interface LetterRequest {
  id: string;
  ticket_no: string;
  type_id: string;
  applicant_id: string;
  kelurahan_id: string;
  rt_unit_id: string | null;
  status: RequestStatus;
  form_data: Record<string, string>;
  reject_reason: string | null;
  submitted_at: string;
  updated_at: string;
  stage_entered_at: string;
}

export interface Approval {
  id: number;
  request_id: string;
  actor_id: string;
  actor_role: UserRole;
  actor_nama: string;
  actor_jabatan: string | null;
  action: ApprovalAction;
  note: string | null;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  created_at: string;
}

export interface RequestDocument {
  id: string;
  request_id: string;
  kind: DocumentKind;
  storage_path: string;
  file_name: string;
  mime: string;
  size_bytes: number;
  uploaded_at: string;
  is_current: boolean;
  ai_status: AiStatus;
  ai_result: AiResult | null;
  ai_checked_at: string | null;
}

/** Ringkasan hasil cek AI yang disimpan (tanpa data pribadi). */
export interface AiResult {
  document_type?: string;
  matches_expected?: boolean;
  confidence?: number;
  reasons?: string[];
  message?: string;
}

export interface RtLetter {
  id: string;
  request_id: string;
  rt_unit_id: string;
  letter_no: string;
  pdf_path: string;
  sha256: string;
  issued_by: string;
  issued_at: string;
}

export interface Letter {
  id: string;
  request_id: string;
  letter_no: string;
  verification_code: string;
  pdf_path: string;
  sha256: string;
  issued_at: string;
}
