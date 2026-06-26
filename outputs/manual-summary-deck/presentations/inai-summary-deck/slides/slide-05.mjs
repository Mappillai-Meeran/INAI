import { base, box, C, text } from "./theme.mjs";
export async function slide05(presentation, ctx) {
  const slide = presentation.slides.add(); base(slide, ctx, "Features Showcase", "INAI combines matching, privacy, collaboration, productivity, and control.", 5);
  text(slide, ctx, 78, 150, 440, 28, "Matching & Discovery", { size: 21, bold: true, color: C.green });
  text(slide, ctx, 704, 150, 460, 28, "Collaboration & Tools", { size: 21, bold: true, color: C.teal });
  const left = [["Matching Modes", "Quick Match, Preference Match, Roommate Match."], ["Interactive Hostel Map", "Visual floor plan for own hostel only."], ["Privacy Model", "Names reveal on request; rooms reveal only on mutual acceptance."], ["Brain Match Quiz", "Personality/preference-based compatibility."]];
  const right = [["1-on-1 Study Sessions", "Schedule, complete, and rate meetings."], ["Group Study Rooms", "Topic-based rooms up to 10 members."], ["Chat System", "Messaging between connected peers."], ["Pomodoro Timer", "Focus timer with Tic-Tac-Toe brain break."], ["Admin Panel", "System oversight, statistics, and moderation."]];
  left.forEach((r, i) => { const x = 78, y = 210 + i * 82; box(slide, ctx, x, y, 462, 60, i % 2 ? "#EFE8DA" : C.white, C.line); text(slide, ctx, x + 16, y + 10, 150, 26, r[0], { size: 15, bold: true, color: C.green }); text(slide, ctx, x + 178, y + 10, 250, 34, r[1], { size: 12.5, color: C.muted }); });
  right.forEach((r, i) => { const x = 704, y = 198 + i * 68; box(slide, ctx, x, y, 462, 50, i % 2 ? "#EFE8DA" : C.white, C.line); text(slide, ctx, x + 16, y + 8, 158, 24, r[0], { size: 14.5, bold: true, color: C.teal }); text(slide, ctx, x + 186, y + 8, 242, 30, r[1], { size: 12.2, color: C.muted }); });
  ctx.addShape(slide, { x: 620, y: 190, w: 1, h: 390, fill: C.line, line: ctx.line(C.line, 0) });
  return slide;
}
