import { configPrueba } from '../../test/soporte.js';
import { CifradoService } from './cifrado.service.js';

const CLAVE = 'a'.repeat(64);

describe('CifradoService', () => {
  const cifrado = new CifradoService(configPrueba({ BOVEDA_CLAVE: CLAVE }));

  it('cifra y descifra con AES-256-GCM', () => {
    const paquete = cifrado.cifrarJson({ nota: 'Aprobado' }, 'boveda:G1:vc1');
    expect(paquete).not.toContain('Aprobado');
    expect(cifrado.descifrarJson(paquete, 'boveda:G1:vc1')).toEqual({
      nota: 'Aprobado',
    });
  });

  it('usa un IV distinto en cada cifrado', () => {
    expect(cifrado.cifrar('hola', 'x')).not.toBe(cifrado.cifrar('hola', 'x'));
  });

  it('detecta contenido alterado', () => {
    const [version, iv, etiqueta, datos] = cifrado
      .cifrar('hola mundo', 'x')
      .split('.');
    const bytes = Buffer.from(datos!, 'base64url');
    bytes[0] = bytes[0]! ^ 1;
    const alterado = [version, iv, etiqueta, bytes.toString('base64url')].join(
      '.',
    );
    expect(() => cifrado.descifrar(alterado, 'x')).toThrow();
  });

  it('no se puede mover a otro titular (AAD)', () => {
    const paquete = cifrado.cifrar('secreto', 'boveda:G1:vc1');
    expect(() => cifrado.descifrar(paquete, 'boveda:G2:vc1')).toThrow();
  });

  it('otra llave no puede descifrar', () => {
    const otra = new CifradoService(
      configPrueba({ BOVEDA_CLAVE: 'b'.repeat(64) }),
    );
    expect(() => otra.descifrar(cifrado.cifrar('secreto', 'x'), 'x')).toThrow();
  });

  it('sin BOVEDA_CLAVE usa una llave fija de desarrollo', () => {
    const a = new CifradoService(configPrueba({ BOVEDA_CLAVE: undefined }));
    const b = new CifradoService(configPrueba({ BOVEDA_CLAVE: undefined }));
    expect(b.descifrar(a.cifrar('hola', 'x'), 'x')).toBe('hola');
  });
});
