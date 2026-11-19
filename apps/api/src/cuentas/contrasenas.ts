import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const LARGO = 64;

function derivar(
  contrasena: string,
  sal: Buffer,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      contrasena.normalize('NFKC'),
      sal,
      LARGO,
      { N: n, r, p },
      (error, clave) => (error ? reject(error) : resolve(clave)),
    );
  });
}

/** `scrypt$N$r$p$sal$hash`: los parámetros viajan con el hash. */
export async function hashContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(16);
  const clave = await derivar(contrasena, sal, N, R, P);
  return [
    'scrypt',
    N,
    R,
    P,
    sal.toString('base64url'),
    clave.toString('base64url'),
  ].join('$');
}

export async function verificarContrasena(
  contrasena: string,
  guardado: string,
): Promise<boolean> {
  const [algoritmo, n, r, p, sal, hash] = guardado.split('$');
  if (algoritmo !== 'scrypt' || !n || !r || !p || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64url');
  const clave = await derivar(
    contrasena,
    Buffer.from(sal, 'base64url'),
    Number(n),
    Number(r),
    Number(p),
  );
  return clave.length === esperado.length && timingSafeEqual(clave, esperado);
}

/** Hash de relleno: el tiempo de respuesta no revela si el correo existe. */
export const HASH_SIN_CUENTA =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' + 'A'.repeat(86);
