/** Curva hipotrocoide (guilloche), como en los documentos de seguridad. */
function guilloche(cx: number, cy: number, R: number, r: number, d: number, escala: number): string {
  const mcd = (a: number, b: number): number => (b ? mcd(b, a % b) : a);
  const total = (2 * Math.PI * r) / mcd(R, r);
  const puntos = 900;
  let ruta = "";
  for (let i = 0; i <= puntos; i++) {
    const t = (total * i) / puntos;
    const x = cx + escala * ((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t));
    const y = cy + escala * ((R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t));
    ruta += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return ruta;
}

/** Código QR ilustrativo (no codifica nada). */
function qrIlustrativo(x: number, y: number, lado: number, n: number) {
  let semilla = 7;
  const azar = () => (semilla = (semilla * 9301 + 49297) % 233280) / 233280;
  const c = lado / n;
  const celdas: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const esquina = (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
      if (!esquina && azar() > 0.55) celdas.push({ x: x + i * c, y: y + j * c });
    }
  }
  const buscadores = [
    [0.5, 0.5],
    [n - 7.5, 0.5],
    [0.5, n - 7.5],
  ] as const;
  return (
    <g fill="#002855">
      {celdas.map((celda, k) => (
        <rect key={k} x={celda.x.toFixed(1)} y={celda.y.toFixed(1)} width={c.toFixed(1)} height={c.toFixed(1)} />
      ))}
      {buscadores.map(([a, b]) => (
        <g key={`${a}-${b}`}>
          <rect x={x + a * c} y={y + b * c} width={7 * c} height={7 * c} fill="none" stroke="#002855" strokeWidth={c} />
          <rect x={x + (a + 2) * c} y={y + (b + 2) * c} width={3 * c} height={3 * c} />
        </g>
      ))}
    </g>
  );
}

const MICROTEXTO = "CREDENCIAL VERIFICABLE · TECNOLÓGICO DE COSTA RICA · ".repeat(14);

/** Ilustración de una credencial con elementos de seguridad (pantalla de entrada). */
export function ArteCredencial() {
  return (
    <svg
      viewBox="0 0 460 300"
      aria-hidden
      className="block h-auto w-full max-w-[460px] drop-shadow-[0_10px_24px_rgba(0,20,50,0.10)]"
    >
      <defs>
        <path id="arte-micro" d="M22 22 H438 V278 H22 Z" />
        <clipPath id="arte-borde">
          <rect x="8" y="8" width="444" height="284" rx="14" />
        </clipPath>
      </defs>
      <rect x="8" y="8" width="444" height="284" rx="14" fill="#fff" stroke="#e1e3e7" />
      <g clipPath="url(#arte-borde)" fill="none" stroke="#002855" strokeWidth=".5" opacity=".16">
        <path d={guilloche(372, 96, 120, 45, 70, 0.95)} />
        <path d={guilloche(372, 96, 96, 36, 58, 0.95)} />
        <path d={guilloche(60, 300, 150, 40, 90, 0.6)} />
      </g>
      <text fontFamily="Roboto Mono, monospace" fontSize="5.2" fill="#002855" opacity=".45" letterSpacing=".6">
        <textPath href="#arte-micro">{MICROTEXTO}</textPath>
      </text>
      <rect x="8" y="8" width="5" height="284" fill="#002855" clipPath="url(#arte-borde)" />
      <text x="40" y="58" fontFamily="Roboto, Arial" fontSize="9" letterSpacing="1.6" fill="#c4202d" fontWeight="500">
        TÍTULO
      </text>
      <text x="40" y="84" fontFamily="Roboto, Arial" fontSize="17" fontWeight="700" fill="#14171c">
        Bachiller en Ingeniería en Computación
      </text>
      <text x="40" y="104" fontFamily="Roboto, Arial" fontSize="10.5" fill="#555b64">
        Otorgada a
      </text>
      <rect x="40" y="112" width="150" height="9" rx="2" fill="#e1e3e7" />
      <text x="40" y="142" fontFamily="Roboto, Arial" fontSize="10.5" fill="#555b64">
        Grado académico · Bachillerato universitario
      </text>
      <rect x="40" y="150" width="190" height="6" rx="2" fill="#ececee" />
      <rect x="40" y="161" width="160" height="6" rx="2" fill="#ececee" />
      {qrIlustrativo(40, 186, 72, 25)}
      <text x="124" y="214" fontFamily="Roboto Mono, monospace" fontSize="8.5" fill="#555b64">
        CV-7Q4K-82MD
      </text>
      <text x="124" y="230" fontFamily="Roboto, Arial" fontSize="8.5" fill="#555b64">
        Huella anclada en Stellar
      </text>
      <g transform="translate(372 222) rotate(-8)">
        <circle r="38" fill="none" stroke="#ef3340" strokeWidth="1.6" />
        <circle r="30" fill="none" stroke="#ef3340" strokeWidth=".8" strokeDasharray="2 2" />
        <path d="M-13 1 L-4 10 L14 -9" fill="none" stroke="#ef3340" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
