// "Time camera" watermark: burns the punch time, date and name into the
// selfie so the photo itself proves when it was taken (like the timestamp
// camera apps staff used to post into WhatsApp).

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const pad = (n: number) => String(n).padStart(2, '0');

export interface StampInfo {
  time: Date;
  name?: string;
  label?: string; // e.g. "准时 ON TIME" / "上班 CHECK IN"
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  const timer = setTimeout(() => reject(new Error('Photo took too long to read')), 2000);
  img.onload = () => { clearTimeout(timer); resolve(img); };
  img.onerror = () => { clearTimeout(timer); reject(new Error('Could not read the photo')); };
  img.src = src;
});

/** Returns a new data URL with the watermark. Throws if the image cannot be drawn. */
export async function stampSelfie(dataUrl: string, info: StampInfo): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const img = await loadImage(dataUrl);
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  if (!canvas.width || !canvas.height) throw new Error('Photo has no size');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;
  const u = Math.min(W, H) / 100; // 1% of the short side

  // Bottom shade so the text reads on any background.
  const shadeH = u * 34;
  const grad = ctx.createLinearGradient(0, H - shadeH, 0, H);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - shadeH, W, shadeH);

  const t = info.time;
  const x = u * 5;
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = u;

  // Big clock
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(u * 15)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const clock = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
  ctx.fillText(clock, x, H - u * 13);
  const clockW = ctx.measureText(clock).width;

  // Accent bar + date block beside the clock
  const bx = x + clockW + u * 3;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(bx, H - u * 25, u * 0.8, u * 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${Math.round(u * 4.6)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`, bx + u * 2.5, H - u * 19.5);
  ctx.fillText(`${WEEKDAYS[t.getDay()]}  :${pad(t.getSeconds())}`, bx + u * 2.5, H - u * 13.5);

  // Name / label line
  const line = [info.label, info.name].filter(Boolean).join('  ·  ');
  if (line) {
    ctx.font = `600 ${Math.round(u * 4.2)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(line, x, H - u * 5);
  }

  return canvas.toDataURL('image/webp', 0.85);
}
