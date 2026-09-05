import fs from "node:fs";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { PDFDocument } from "pdf-lib";
import type { Certificate } from "./types";
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

function Seal() {
  return (
    <div
      style={{
        width: 150,
        height: 150,
        borderRadius: 999,
        border: "5px solid #9D382C",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-12deg)",
        opacity: 0.92,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: MADDER }}>آموزشگاه هنری</div>
      <div
        style={{
          width: 34,
          height: 34,
          backgroundColor: MADDER,
          transform: "rotate(45deg)",
          margin: "10px 0",
        }}
      />
      <div style={{ fontSize: 19, fontWeight: 900, color: MADDER }}>اسدزاده</div>
    </div>
  );
}

function template(cert: Certificate) {
  return (
    <div
      style={{
        width: W,
        height: H,
        backgroundColor: PAPER,
        display: "flex",
        padding: 30,
        fontFamily: "Vazirmatn",
        direction: "rtl",
      }}
    >
      <div
        style={{
          flex: 1,
          border: `4px solid ${NAVY}`,
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "34px 60px 30px",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 30,
                height: 30,
                backgroundColor: NAVY,
                transform: "rotate(45deg)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 12,
              }}
            >
              <div style={{ width: 12, height: 12, backgroundColor: MADDER }} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: NAVY }}>آموزشگاه هنری اسدزاده</div>
          </div>
          <div style={{ fontSize: 46, fontWeight: 900, color: NAVY, marginTop: 10 }}>گواهی پایان دوره</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9A9D9A", letterSpacing: 4 }}>
            CERTIFICATE OF COMPLETION
          </div>
        </div>

        {/* body */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontSize: 19, color: INK }}>گواهی می‌شود</div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: MADDER,
              borderBottom: `3px solid ${OCHRE}`,
              paddingBottom: 8,
              paddingLeft: 40,
              paddingRight: 40,
              marginTop: 6,
            }}
          >
            {cert.student}
          </div>
          <div style={{ fontSize: 19, color: INK, marginTop: 16, textAlign: "center", lineHeight: 1.9 }}>
            {`دوره آموزشی «${cert.course}» را به مدت ${toFa(cert.hours)} ساعت با موفقیت به پایان رسانده است`}
          </div>
          <div style={{ display: "flex", marginTop: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>{`تاریخ صدور: ${cert.date}`}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginRight: 36 }}>
              {`Code: ${cert.code}`}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", width: "100%", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: NAVY }}>رضا اسدزاده</div>
            <div style={{ width: 200, height: 2, backgroundColor: "#999", margin: "6px 0" }} />
            <div style={{ fontSize: 14, color: "#777" }}>مدیر آموزشگاه و استاد دوره</div>
          </div>
          <Seal />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#777" }}>استعلام اصالت</div>
            <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>{`asadzedeh.ir/verify/${cert.code}`}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Render a pixel-perfect Persian certificate PDF (A4 landscape). */
export async function generateCertificatePdf(cert: Certificate): Promise<Buffer> {
  const svg = await satori(template(cert), {
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
