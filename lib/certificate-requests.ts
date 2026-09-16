import crypto from "node:crypto";
import { getSql } from "./db/client";
import type { CertificateRequest, CertificateRequestStatus } from "./types";

function fromRow(row: Record<string, unknown>): CertificateRequest {
  return row.payload as CertificateRequest;
}

export async function ensureCertificateRequest(input: Omit<CertificateRequest, "id" | "status" | "requestedAt">): Promise<{ request: CertificateRequest; created: boolean }> {
  const sql = await getSql();
  const request: CertificateRequest = {
    ...input,
    id: `cr-${crypto.randomBytes(10).toString("hex")}`,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO certificate_requests
       (id, user_id, course_slug, status, requested_at, completed_at, payload)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6::text::jsonb)
     ON CONFLICT (user_id, course_slug) DO NOTHING
     RETURNING payload`,
    [request.id, request.userId, request.courseSlug, request.requestedAt, request.completedAt, JSON.stringify(request)],
  );
  if (rows[0]) return { request: fromRow(rows[0]), created: true };
  const existing = await getCertificateRequestForCourse(request.userId, request.courseSlug);
  if (!existing) throw new Error("certificate request conflict without an existing row");
  return { request: existing, created: false };
}

export async function getCertificateRequests(): Promise<CertificateRequest[]> {
  const sql = await getSql();
  const rows = await sql.query<Record<string, unknown>>("SELECT payload FROM certificate_requests ORDER BY requested_at DESC");
  return rows.map(fromRow);
}

export async function getCertificateRequestsByUser(userId: string): Promise<CertificateRequest[]> {
  const sql = await getSql();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT payload FROM certificate_requests WHERE user_id = $1 ORDER BY requested_at DESC",
    [userId],
  );
  return rows.map(fromRow);
}

export async function getCertificateRequest(id: string): Promise<CertificateRequest | undefined> {
  const sql = await getSql();
  const rows = await sql.query<Record<string, unknown>>("SELECT payload FROM certificate_requests WHERE id = $1", [id]);
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function getCertificateRequestForCourse(userId: string, courseSlug: string): Promise<CertificateRequest | undefined> {
  const sql = await getSql();
  const rows = await sql.query<Record<string, unknown>>(
    "SELECT payload FROM certificate_requests WHERE user_id = $1 AND course_slug = $2",
    [userId, courseSlug],
  );
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export async function updateCertificateRequest(
  id: string,
  patch: Partial<Pick<CertificateRequest, "status" | "reviewedAt" | "reviewedBy" | "adminNote" | "certificateCode" | "deliveryType" | "pdfObjectKey">>,
): Promise<CertificateRequest | undefined> {
  const current = await getCertificateRequest(id);
  if (!current) return undefined;
  const next = { ...current, ...patch };
  const sql = await getSql();
  const rows = await sql.query<Record<string, unknown>>(
    `UPDATE certificate_requests
        SET status = $2, reviewed_at = $3, reviewed_by = $4, certificate_code = $5, payload = $6::text::jsonb
      WHERE id = $1 RETURNING payload`,
    [id, next.status, next.reviewedAt ?? null, next.reviewedBy ?? null, next.certificateCode ?? null, JSON.stringify(next)],
  );
  return rows[0] ? fromRow(rows[0]) : undefined;
}

export function isCertificateRequestStatus(value: string): value is CertificateRequestStatus {
  return ["pending", "approved", "issued", "rejected"].includes(value);
}
