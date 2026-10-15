-- Revisi 1 (1/3): nilai enum baru.
-- File tersendiri: nilai enum baru tidak boleh dipakai dalam transaksi yang sama dengan ADD VALUE.
-- Nilai lama (diajukan, ditolak, menunggu_camat, reject, sign_camat) DIBIARKAN, hanya tidak dipakai lagi.

alter type public.user_role add value if not exists 'rt_rw';

alter type public.request_status add value if not exists 'menunggu_rt';
alter type public.request_status add value if not exists 'ditolak_rt';
alter type public.request_status add value if not exists 'menunggu_kelurahan';
alter type public.request_status add value if not exists 'ditolak_kelurahan';

alter type public.approval_action add value if not exists 'approve_rt';
alter type public.approval_action add value if not exists 'reject_rt';
alter type public.approval_action add value if not exists 'reject_kelurahan';
