import { base, box, C, text } from "./theme.mjs";
export async function slide02(presentation, ctx) {
  const slide = presentation.slides.add(); base(slide, ctx, "Problem & Existing Solutions", "Hostel students need help nearby, but discovery is unsafe and random.", 2);
  const problems = [["Stuck at Night", "No one to ask during late-night study sessions."], ["Roommate Mismatch", "Clashing sleep schedules and study habits cause stress."], ["Hostel Blindness", "Students do not know who is skilled in each subject."], ["Safety & Privacy", "Room numbers should not be shared publicly."], ["Inefficient Coordination", "Plans are scattered across disconnected apps."], ["No Algorithmic Matching", "Study partners are found by chance, not fit."]];
  problems.forEach((p, i) => { const x = 54 + (i % 3) * 252, y = 156 + Math.floor(i / 3) * 122; box(slide, ctx, x, y, 222, 92); text(slide, ctx, x + 12, y + 10, 190, 22, p[0], { size: 15, bold: true, color: [C.coral, C.plum, C.gold, C.teal, C.green, C.ink][i] }); text(slide, ctx, x + 12, y + 38, 188, 38, p[1], { size: 12.5, color: C.muted }); });
  text(slide, ctx, 842, 154, 360, 24, "Limitations of existing solutions", { size: 18, bold: true });
  const rows = [["Method", "Limitation"], ["WhatsApp Groups", "Cluttered, no privacy, no skill matching."], ["Notice Boards", "Slow, limited reach, exposes rooms."], ["Word of Mouth", "Restricted to small social circles."]];
  rows.forEach((r, i) => { const y = 204 + i * 54, fill = i === 0 ? C.dark : (i % 2 ? C.white : "#EFE8DA"), color = i === 0 ? C.white : C.ink; text(slide, ctx, 820, y, 150, 34, r[0], { size: 13, bold: true, color, fill }); text(slide, ctx, 978, y, 242, 34, r[1], { size: 12.5, color, fill }); });
  ctx.addShape(slide, { x: 76, y: 556, w: 1080, h: 54, fill: C.dark, line: ctx.line(C.dark, 0) });
  text(slide, ctx, 96, 566, 1040, 32, "\"The right study partner is 2 rooms away - but you'll never know.\"", { size: 24, bold: true, color: "#F6E7C4", align: "center" });
  return slide;
}
