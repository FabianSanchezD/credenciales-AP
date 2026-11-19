import type { TitularInscrito } from '@repo/cliente';

/**
 * Titular inscrito con un emisor. Solo guarda su DID y la cuenta derivada:
 * la plataforma nunca almacena nombre, cédula ni otros datos personales.
 */
export type Titular = TitularInscrito;
