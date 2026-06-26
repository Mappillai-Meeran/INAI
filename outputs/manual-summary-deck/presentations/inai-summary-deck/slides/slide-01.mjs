import { C, text } from "./theme.mjs";
export async function slide01(presentation, ctx) {
  const slide = presentation.slides.add();
  slide.background.fill = C.dark;
  ctx.addShape(slide, { x: 0, y: 0, w: 1280, h: 720, fill: C.dark, line: ctx.line(C.dark, 0) });
  ctx.addShape(slide, { x: 782, y: 0, w: 498, h: 720, fill: "#173B31", line: ctx.line("#173B31", 0) });
  text(slide, ctx, 60, 68, 300, 24, "MICRO PROJECT PRESENTATION", { size: 13, bold: true, color: "#9FE3C8", insets: { left: 0, right: 0, top: 0, bottom: 0 } });
  text(slide, ctx, 60, 128, 640, 92, "INAI", { size: 72, bold: true, color: C.white, face: ctx.fonts.title, insets: { left: 0, right: 0, top: 0, bottom: 0 } });
  text(slide, ctx, 60, 226, 680, 86, "A Smart Peer Learning and Knowledge Sharing Platform", { size: 34, bold: true, color: "#F6E7C4", face: ctx.fonts.title, insets: { left: 0, right: 0, top: 0, bottom: 0 } });
  text(slide, ctx, 62, 334, 620, 44, "Intelligent Network for Academic Integration", { size: 22, bold: true, color: "#DDE8DE", insets: { left: 0, right: 0, top: 0, bottom: 0 } });
  text(slide, ctx, 64, 452, 520, 26, "Team: MappillaiMeeran A & Dhinesh S", { size: 16, color: C.white });
  text(slide, ctx, 64, 494, 520, 26, "College: SMVEC", { size: 16, color: C.white });
  text(slide, ctx, 64, 536, 520, 26, "Department: Master of Computer Applications (MCA)", { size: 16, color: C.white });
  text(slide, ctx, 64, 578, 520, 26, "Date: June 2026", { size: 16, color: C.white });
  [["Register", 878, 142], ["Match", 1018, 292], ["Connect Safely", 878, 444]].forEach(([label, x, y], i) => {
    ctx.addShape(slide, { x, y, w: 136, h: 136, geometry: "ellipse", fill: [C.green, C.gold, C.teal][i], line: ctx.line("#FFFFFF55", 2) });
    text(slide, ctx, x + 12, y + 50, 112, 36, label, { size: i === 2 ? 15 : 18, bold: true, color: C.white, align: "center" });
  });
  text(slide, ctx, 32, 668, 300, 18, "Inai = connection", { size: 10, color: "#9FE3C8" });
  return slide;
}
