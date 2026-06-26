export const C = {
  bg: "#F7F3EA",
  ink: "#17201B",
  muted: "#5E665F",
  line: "#D8D0C2",
  green: "#0F7A5A",
  teal: "#0B7285",
  gold: "#B87916",
  coral: "#C4493D",
  plum: "#5B3A70",
  white: "#FFFFFF",
  dark: "#102019",
};

export function text(slide, ctx, x, y, w, h, value, opts = {}) {
  return ctx.addText(slide, {
    x, y, w, h,
    text: value,
    name: opts.name,
    fontSize: opts.size ?? 16,
    color: opts.color ?? C.ink,
    bold: opts.bold ?? false,
    typeface: opts.face ?? ctx.fonts.body,
    align: opts.align ?? "left",
    valign: opts.valign ?? "top",
    insets: opts.insets ?? { left: 8, right: 8, top: 6, bottom: 6 },
    fill: opts.fill ?? "#00000000",
    line: opts.line ?? ctx.line("#00000000", 0),
  });
}

export function box(slide, ctx, x, y, w, h, fill = C.white, line = C.line) {
  return ctx.addShape(slide, { x, y, w, h, geometry: "roundRect", fill, line: ctx.line(line, 1) });
}

export function base(slide, ctx, kicker, title, page) {
  slide.background.fill = C.bg;
  ctx.addShape(slide, { x: 42, y: 41, w: 8, h: 8, geometry: "ellipse", fill: C.green, line: ctx.line(C.green, 0), name: `kicker-${page}-marker` });
  text(slide, ctx, 58, 34, 420, 22, kicker.toUpperCase(), { size: 12, bold: true, color: C.green, name: `kicker-${page}-label` });
  text(slide, ctx, 42, 62, 940, 62, title, { size: 34, bold: true, face: ctx.fonts.title, insets: { left: 0, right: 0, top: 0, bottom: 0 } });
  ctx.addShape(slide, { x: 42, y: 124, w: 1196, h: 1, fill: C.line, line: ctx.line(C.line, 0) });
  text(slide, ctx, 42, 668, 620, 18, "INAI | Smart Peer Learning and Knowledge Sharing Platform", { size: 10, color: C.muted });
  text(slide, ctx, 1154, 668, 70, 18, String(page).padStart(2, "0"), { size: 10, color: C.muted, align: "right" });
}
