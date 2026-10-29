// 2.5D office robot (SVG). Pose = state of the projects the agent owns.
// Motion is CSS-only and stops with "reduce motion" or when the tab is hidden.

function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16);
  return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [148, 163, 184];
}
function mix(rgb, to, t) { return '#' + rgb.map((v, i) => Math.round(v + (to[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
function palette(hex) {
  const c = hexToRgb(hex), W = [255, 255, 255], K = [8, 12, 20];
  return { light: mix(c, W, 0.25), dark: mix(c, K, 0.35), shade: mix(c, K, 0.6), eye: mix(c, W, 0.6) };
}
const RING = { running: '#34d399', stopped: '#94a3b8', attention: '#f5a54a', unknown: '#7b8ba0', planning: '#7aa7ff' };
const MOTION = { running: 'rb-bob', stopped: 'rb-breathe', attention: 'rb-hop', unknown: '', planning: 'rb-sway' };
let seq = 0;

export function robotSVG({ color, shape = 'antenna', pose = 'unknown', size = 64 }) {
  const id = 'rb' + (++seq);
  const c = palette(color);
  const s = c.shade, e = c.eye, ring = RING[pose] || RING.unknown;
  const work = pose === 'running', sleep = pose === 'stopped', alert = pose === 'attention', plan = pose === 'planning', unk = pose === 'unknown';
  const sides = {
    ears: `<rect x="8" y="37" width="11" height="20" rx="3.5" fill="${s}"/><rect x="95" y="37" width="11" height="20" rx="3.5" fill="${s}"/>`,
    horns: `<path d="M27 24 L20 7 L40 20 Z" fill="${s}"/><path d="M87 24 L94 7 L74 20 Z" fill="${s}"/>`,
    round: `<circle cx="15" cy="47" r="9" fill="${s}"/><circle cx="99" cy="47" r="9" fill="${s}"/>`,
    antenna: '',
  }[shape] ?? '';
  const face = work ? `<path d="M38 51 Q44 43 50 51" stroke="${e}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M64 51 Q70 43 76 51" stroke="${e}" stroke-width="3.4" fill="none" stroke-linecap="round"/><rect x="52" y="58" width="10" height="3" rx="1.5" fill="${e}" opacity=".75"/>`
    : sleep ? `<path d="M38 48 Q44 54 50 48" stroke="${e}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><path d="M64 48 Q70 54 76 48" stroke="${e}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`
    : alert ? `<g class="rb-blink"><circle cx="44" cy="47" r="6" fill="${e}"/><circle cx="70" cy="47" r="6" fill="${e}"/><circle cx="46" cy="45" r="2" fill="#fff"/><circle cx="72" cy="45" r="2" fill="#fff"/></g><circle cx="57" cy="59" r="3" fill="${e}" opacity=".85"/>`
    : plan ? `<circle cx="46" cy="44" r="5" fill="${e}"/><circle cx="72" cy="44" r="5" fill="${e}"/><path d="M52 59 Q57 61 62 58" stroke="${e}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".75"/>`
    : `<text x="57" y="56" text-anchor="middle" font-size="22" font-weight="700" fill="${e}" opacity=".7" font-family="system-ui,sans-serif">?</text>`;
  const arms = work ? `<rect class="rb-type-a" x="23" y="88" width="10" height="20" rx="5" fill="${s}"/><rect class="rb-type-b" x="83" y="88" width="10" height="20" rx="5" fill="${s}"/><rect x="24" y="108" width="70" height="8" rx="3" fill="#1f3044"/>`
    : alert ? `<rect x="22" y="84" width="10" height="22" rx="5" fill="${s}"/><g class="rb-wave"><rect x="86" y="58" width="10" height="28" rx="5" fill="${s}"/><circle cx="91" cy="57" r="6.5" fill="${c.light}"/></g>`
    : plan ? `<rect x="22" y="84" width="10" height="22" rx="5" fill="${s}"/><rect x="84" y="84" width="10" height="20" rx="5" fill="${s}"/><line x1="92" y1="104" x2="104" y2="90" stroke="${e}" stroke-width="3.5" stroke-linecap="round"/>`
    : `<rect x="22" y="84" width="10" height="22" rx="5" fill="${s}"/><rect x="84" y="84" width="10" height="22" rx="5" fill="${s}"/>`;
  const extra = work ? `<g class="rb-spin"><circle cx="103" cy="16" r="8" fill="none" stroke="${ring}" stroke-width="4.5" stroke-dasharray="3.2 2.6"/><circle cx="103" cy="16" r="3" fill="${ring}"/></g>`
    : sleep ? `<text class="rb-zz" x="90" y="24" font-size="13" font-weight="700" fill="#a9b6c6">Z</text><text class="rb-zz rb-z2" x="98" y="15" font-size="10" font-weight="700" fill="#a9b6c6">Z</text>`
    : alert ? `<g class="rb-bounce"><circle cx="104" cy="22" r="11" fill="${ring}"/><text x="104" y="27.5" text-anchor="middle" font-size="15" font-weight="800" fill="#2a1804">!</text></g>`
    : plan ? `<circle class="rb-think" cx="90" cy="20" r="3" fill="${ring}"/><circle class="rb-think rb-t2" cx="98" cy="12" r="4.5" fill="${ring}"/><circle class="rb-think rb-t3" cx="108" cy="5" r="6" fill="${ring}"/>` : '';
  return `<svg class="robot" data-pose="${pose}" width="${size}" height="${Math.round(size * 130 / 120)}" viewBox="0 0 120 130" aria-hidden="true" focusable="false">
<defs><linearGradient id="${id}h" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${c.light}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>
<radialGradient id="${id}v" cx=".35" cy=".25" r=".9"><stop offset="0" stop-color="#1b2a3d"/><stop offset="1" stop-color="#070d16"/></radialGradient></defs>
<ellipse cx="60" cy="124" rx="31" ry="5" fill="#000" opacity=".3"/>
${unk ? '<rect x="6" y="1" width="108" height="126" rx="26" fill="none" stroke="#7b8ba0" stroke-width="2" stroke-dasharray="6 6"/>' : ''}
<g class="${MOTION[pose] || ''}" opacity="${unk ? 0.62 : 1}">
<line x1="57" y1="20" x2="57" y2="9" stroke="${s}" stroke-width="3.5" stroke-linecap="round"/><circle class="${work ? 'rb-bulb' : ''}" cx="57" cy="7.5" r="5" fill="${e}"/>
${sides}
<rect x="21" y="23" width="80" height="56" rx="22" fill="${s}"/><rect x="17" y="19" width="80" height="56" rx="22" fill="url(#${id}h)"/>
<rect x="27" y="23" width="34" height="5" rx="2.5" fill="#fff" opacity=".38"/><rect x="26" y="31" width="62" height="35" rx="13" fill="url(#${id}v)"/>
${face}
<rect x="52" y="73" width="12" height="8" rx="2" fill="${s}"/><rect x="38" y="82" width="48" height="32" rx="12" fill="${s}"/><rect x="34" y="78" width="48" height="32" rx="12" fill="url(#${id}h)"/>
<circle cx="58" cy="94" r="5.5" fill="${ring}"/>
${arms}
</g>${extra}</svg>`;
}
