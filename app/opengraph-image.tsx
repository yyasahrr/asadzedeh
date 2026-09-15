import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function font(file: string) {
  return fs.readFileSync(path.join(process.cwd(), "assets", "fonts", file));
}

export default async function OgImage() {
  const regular = font("Vazirmatn-Regular.ttf");
  const black = font("Vazirmatn-Black.ttf");
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          backgroundColor: "#152F3D",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Vazirmatn",
          direction: "rtl",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 54,
              height: 54,
              backgroundColor: "#193B5C",
              border: "3px solid #E8D8B8",
              transform: "rotate(45deg)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginLeft: 20,
            }}
          >
            <div style={{ width: 20, height: 20, backgroundColor: "#9D382C" }} />
          </div>
          <div style={{ fontSize: 60, fontWeight: 900, color: "#FFFFFF" }}>اسدزاده</div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 900, color: "#E8D8B8", marginTop: 24 }}>
          هنر ایرانی را از استاد یاد بگیرید
        </div>
        <div style={{ fontSize: 24, color: "rgba(255,255,255,0.75)", marginTop: 12 }}>
          آموزش فرش، گلیم و هنرهای بافت ایرانی — آنلاین و حضوری
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            width: 420,
            height: 10,
            borderRadius: 999,
            backgroundColor: "#9D382C",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Vazirmatn", data: regular, weight: 400, style: "normal" },
        { name: "Vazirmatn", data: black, weight: 900, style: "normal" },
      ],
    }
  );
}
