import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import { toFa } from "./format";

const W = 1123;
const H = 794;

let cachedFonts: { name: string; data: Buffer; weight: 400 | 700 | 900; style: "normal" }[] | null = null;

function loadFonts() {
  if (cachedFonts) return cachedFonts;
  const dir = path.join(process.cwd(), "assets", "fonts");
  cachedFonts = [
    { name: "Vazirmatn", data: fs.readFileSync(path.join(dir, "Vazirmatn-Regular.ttf")), weight: 400, style: "normal" },
    { name: "Vazirmatn", data: fs.readFileSync(path.join(dir, "Vazirmatn-Bold.ttf")), weight: 700, style: "normal" },
    { name: "Vazirmatn", data: fs.readFileSync(path.join(dir, "Vazirmatn-Black.ttf")), weight: 900, style: "normal" },
  ];
  return cachedFonts;
}

const NAVY = "#193B5C";
const MADDER = "#9D382C";
const OCHRE = "#C08A3E";
const INK = "#3A3D3A";
const PAPER = "#FBF5E9";

export interface EnrollmentCardData {
  studentName: string;
  classTitle: string;
  instructor: string;
  startDate: string;
  days: string;
  time: string;
  sessions: number;
  location: string;
  code: string;
  siteUrl: string;
}

function Seal() {
  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: 999,
        border: "3px solid #9D382C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-8deg)",
        opacity: 0.88,
      }}
    >
      <div style={{ fontSize: 9, fontWeight: 700, color: MADDER }}>آموزشگاه هنری</div>
      <div
        style={{
          width: 18,
          height: 18,
          backgroundColor: MADDER,
          transform: "rotate(45deg)",
          margin: "4px 0",
        }}
      />
      <div style={{ fontSize: 11, fontWeight: 900, color: MADDER }}>اسدزاده</div>
    </div>
  );
}

function LogoMark() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          width: 24,
          height: 24,
          backgroundColor: NAVY,
          transform: "rotate(45deg)",
          borderRadius: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: 8,
        }}
      >
        <div style={{ width: 10, height: 10, backgroundColor: MADDER }} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 900, color: NAVY }}>آموزشگاه هنری اسدزاده</div>
    </div>
  );
}

function template(data: EnrollmentCardData) {
  return (
    <div
      style={{
        width: W,
        height: H,
        backgroundColor: PAPER,
        display: "flex",
        fontFamily: "Vazirmatn",
        direction: "rtl",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: 36,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <LogoMark />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: NAVY }}>کارت ورود به کلاس</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9A9D9A", letterSpacing: 3, marginTop: 2 }}>
              ENROLLMENT CARD
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div style={{ display: "flex", gap: 24, flex: 1 }}>
          {/* Left: Student info */}
          <div
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              border: `2px solid ${NAVY}20`,
              padding: "28px 32px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Student name */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>نام هنرجو</div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: MADDER,
                  borderBottom: `3px solid ${OCHRE}`,
                  paddingBottom: 8,
                }}
              >
                {data.studentName}
              </div>
            </div>

            {/* Class info grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              <InfoRow label="دوره" value={data.classTitle} />
              <InfoRow label="مدرس" value={data.instructor} />
              <div style={{ display: "flex", gap: 14 }}>
                <InfoRow label="تاریخ شروع" value={data.startDate} small />
                <InfoRow label="تعداد جلسات" value={`${toFa(data.sessions)} جلسه`} small />
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <InfoRow label="روزها و ساعت" value={`${data.days} • ${data.time}`} small />
                <InfoRow label="محل برگزاری" value={data.location} small />
              </div>
            </div>
          </div>

          {/* Right: Code + QR area */}
          <div
            style={{
              width: 300,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Code box */}
            <div
              style={{
                width: "100%",
                backgroundColor: NAVY,
                borderRadius: 18,
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>کد یکتای ورود</div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#FFFFFF",
                  letterSpacing: 6,
                  fontFamily: "monospace",
                  direction: "ltr",
                }}
              >
                {data.code}
              </div>
            </div>

            {/* Seal */}
            <Seal />

            {/* Verification */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#999" }}>استعلام اصالت</div>
              <div style={{ fontSize: 10, color: "#999", direction: "ltr" }}>
                {data.siteUrl.replace(/\/$/, "")}/verify/{data.code}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
            paddingTop: 16,
            borderTop: `1px solid ${NAVY}15`,
          }}
        >
          <div style={{ fontSize: 11, color: "#999" }}>
            این کارت متعلق به هنرجوی ثبت‌نام‌شده است و غیرقابل انتقال می‌باشد.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#999" }}>ناصر اسدزاده</div>
            <div style={{ width: 80, height: 1, backgroundColor: "#CCC" }} />
            <div style={{ fontSize: 10, color: "#BBB" }}>مدیر آموزشگاه</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: small ? 10 : 11, color: "#999", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: small ? 14 : 16, fontWeight: 700, color: INK }}>{value}</div>
    </div>
  );
}

/** Render a pixel-perfect Persian enrollment card PDF (A4 landscape). */
export async function generateEnrollmentCardPdf(data: EnrollmentCardData): Promise<Buffer> {
  const svg = await satori(template(data), {
    width: W,
    height: H,
    fonts: loadFonts(),
  });
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: W * 2 },
    background: PAPER,
  })
    .render()
    .asPng();

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]);
  const img = await pdf.embedPng(png);
  page.drawImage(img, { x: 0, y: 0, width: 841.89, height: 595.28 });
  return Buffer.from(await pdf.save());
}
