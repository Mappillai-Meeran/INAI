import { base, box, C, text } from "./theme.mjs";
export async function slide03(presentation, ctx) {
  const slide = presentation.slides.add(); base(slide, ctx, "Our Solution + Algorithm", "INAI uses profile data to compute safe, ranked compatibility.", 3);
  [["1", "Register", "Input skills, hostel location, and lifestyle habits."], ["2", "Match", "Engine computes highest compatibility scores."], ["3", "Connect Safely", "Names and rooms stay hidden until mutual accept."]].forEach((s, i) => { const x = 68 + i * 292; ctx.addShape(slide, { x, y: 166, w: 78, h: 78, geometry: "ellipse", fill: [C.green, C.gold, C.teal][i], line: ctx.line("#FFFFFF", 2) }); text(slide, ctx, x + 18, 180, 40, 38, s[0], { size: 30, bold: true, color: C.white, align: "center" }); text(slide, ctx, x + 95, 166, 170, 28, s[1], { size: 20, bold: true }); text(slide, ctx, x + 95, 198, 180, 42, s[2], { size: 12.5, color: C.muted }); if (i < 2) ctx.addShape(slide, { x: x + 258, y: 202, w: 44, h: 3, fill: C.line, line: ctx.line(C.line, 0) }); });
  text(slide, ctx, 72, 304, 490, 28, "Matching algorithm scoring", { size: 20, bold: true });
  const rows = [["Factor", "Weight", "Description"], ["Proximity", "40%", "Same block or same floor gives highest points."], ["Skill Match", "30%", "Need Help aligns with Strong Skill."], ["Academic Base", "20%", "Same branch and year of study."], ["Familiarity", "10%", "Same home state or language."]];
  rows.forEach((r, i) => { const y = 342 + i * 44, fill = i === 0 ? C.dark : (i % 2 ? C.white : "#EFE8DA"), color = i === 0 ? C.white : C.ink; text(slide, ctx, 78, y, 170, 28, r[0], { size: 13, bold: true, color, fill }); text(slide, ctx, 260, y, 80, 28, r[1], { size: 15, bold: true, color: i === 0 ? C.white : C.green, align: "center", fill }); text(slide, ctx, 352, y, 306, 28, r[2], { size: 12.2, color, fill }); });
  box(slide, ctx, 720, 330, 450, 210, C.dark, C.dark);
  text(slide, ctx, 744, 354, 390, 28, "Live example calculation", { size: 16, bold: true, color: "#9FE3C8" });
  text(slide, ctx, 744, 390, 390, 32, "Saravanavelu M -> Muthu Pandi K", { size: 22, bold: true, color: C.white });
  text(slide, ctx, 744, 434, 390, 50, "Need help in Java + Strong in Java\nBlock A + MCA 2nd Year", { size: 15, color: "#DDE8DE" });
  text(slide, ctx, 744, 494, 390, 30, "Match Score: 80% High Compatibility", { size: 20, bold: true, color: "#F6E7C4" });
  return slide;
}
