import { base, box, C, text } from "./theme.mjs";
export async function slide07(presentation, ctx) {
  const slide = presentation.slides.add(); base(slide, ctx, "Conclusion + Future Scope", "INAI V1 proves the campus use case; V2 can make it real-time and smarter.", 7);
  text(slide, ctx, 70, 150, 520, 24, "What We Built vs. Future Version", { size: 21, bold: true, color: C.green });
  const rows = [["What We Built (V1)", "Future Version (V2)"], ["REST API with 30s polling", "Real-time WebSockets"], ["Web application", "Progressive Web App installable"], ["Algorithmic matching", "AI / machine learning matching"]];
  rows.forEach((r, i) => { const y = 198 + i * 58, fill = i === 0 ? C.dark : (i % 2 ? C.white : "#EFE8DA"), color = i === 0 ? C.white : C.ink; text(slide, ctx, 76, y, 270, 36, r[0], { size: i ? 14 : 14, bold: true, color, fill }); text(slide, ctx, 358, y, 300, 36, r[1], { size: i ? 14 : 14, bold: true, color, fill }); });
  text(slide, ctx, 720, 150, 420, 24, "Future scope: 5 key points", { size: 21, bold: true, color: C.teal });
  [["WebSockets", "True real-time chat and notifications."], ["PWA Integration", "Offline access and mobile-like install."], ["AI Matching", "Use ratings to improve match accuracy."], ["Hostel Authority Portal", "Warden announcements and room workflows."], ["Multi-Language Support", "Localize UI for diverse students."]].forEach((r, i) => { box(slide, ctx, 720, 190 + i * 60, 420, 44, C.white, C.line); text(slide, ctx, 736, 197 + i * 60, 154, 22, r[0], { size: 13, bold: true, color: [C.green, C.gold, C.plum, C.coral, C.teal][i] }); text(slide, ctx, 898, 197 + i * 60, 216, 22, r[1], { size: 12, color: C.muted }); });
  ctx.addShape(slide, { x: 112, y: 590, w: 960, h: 52, fill: C.dark, line: ctx.line(C.dark, 0) });
  text(slide, ctx, 130, 600, 925, 30, "\"Connecting minds, one room at a time.\"", { size: 24, bold: true, color: "#F6E7C4", align: "center" });
  return slide;
}
