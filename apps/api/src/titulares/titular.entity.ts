/**
 * Titular inscrito con un emisor. Solo guarda su DID y la cuenta derivada:
 * la plataforma nunca almacena nombre, cédula ni otros datos personales.
 */
export interface Titular {
  id: string;
  emisorId: string;
  did: string;
  stellarAddress: string;
  registradoEn: string;
}
