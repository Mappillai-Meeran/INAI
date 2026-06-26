import { base, box, C, text } from "./theme.mjs";
export async function slide04(presentation, ctx) {
  const slide = presentation.slides.add(); base(slide, ctx, "System Architecture + Tech Stack", "A 3-tier web system connects browser UI, REST API, and MongoDB Atlas.", 4);
  const nodes = [["Frontend: User Browser", "HTML / CSS / JS\nSends JSON over HTTP", 64, 174, C.teal], ["Backend Server", "Node.js & Express.js\nREST API + token auth", 480, 174, C.green], ["Cloud Database", "MongoDB Atlas\nMongoose ODM", 896, 174, C.gold]];
  nodes.forEach(n => { box(slide, ctx, n[2], n[3], 298, 122, C.white, n[4]); text(slide, ctx, n[2] + 18, n[3] + 16, 250, 26, n[0], { size: 20, bold: true, color: n[4] }); text(slide, ctx, n[2] + 18, n[3] + 52, 250, 52, n[1], { size: 14, color: C.muted }); });
  [[366, 234], [782, 234]].forEach(a => { ctx.addShape(slide, { x: a[0], y: a[1], w: 82, h: 3, fill: C.ink, line: ctx.line(C.ink, 0) }); ctx.addShape(slide, { x: a[0] + 73, y: a[1] - 6, w: 14, h: 14, geometry: "triangle", fill: C.ink, line: ctx.line(C.ink, 0) }); });
  text(slide, ctx, 80, 342, 520, 24, "Tech stack table", { size: 20, bold: true, color: C.green });
  const rows = [["Layer", "Technologies Used", "Purpose"], ["Frontend", "HTML5, CSS3, Vanilla JS", "Fast responsive UI with no heavy frameworks."], ["Backend", "Node.js, Express.js", "Stateless REST API with token authentication."], ["Database", "MongoDB Atlas", "Cloud NoSQL database for flexible profiles."], ["Security", "PBKDF2", "Server-side password hashing, 120k iterations."]];
  rows.forEach((r, i) => { const y = 380 + i * 42, fill = i === 0 ? C.dark : (i % 2 ? C.white : "#EFE8DA"), color = i === 0 ? C.white : C.ink; text(slide, ctx, 84, y, 160, 28, r[0], { size: 12.5, bold: true, color, fill }); text(slide, ctx, 252, y, 250, 28, r[1], { size: 12.5, bold: true, color: i === 0 ? C.white : C.teal, fill }); text(slide, ctx, 510, y, 350, 28, r[2], { size: 12.2, color, fill }); });
  box(slide, ctx, 912, 378, 236, 174, C.dark, C.dark);
  text(slide, ctx, 934, 398, 192, 24, "Stored data", { size: 17, bold: true, color: "#F6E7C4", align: "center" });
  text(slide, ctx, 934, 438, 192, 70, "Users\nRequests\nChat messages\nStudy rooms\nStudy sessions", { size: 14, color: C.white, align: "center" });
  return slide;
}
