# ADR 0003: Persistencia y bóveda del titular

- Estado: aceptada (prueba de concepto)
- Fecha: 2026-11-18

## Decisión

- **Base de datos**: `node:sqlite` (incluido en Node 24+). Sin servidores ni Docker; el archivo se
  configura con `DATABASE_PATH` y las pruebas usan `:memory:`. Los repositorios siguen siendo clases
  abstractas, así que cambiar a Postgres solo exige nuevas implementaciones.
- **Qué se guarda**: emisores, titulares inscritos (solo DID), plantillas, emisiones (metadatos y
  hash) y la bóveda de cada titular. Ningún nombre, cédula ni correo (RNF-01, Tabla 7).
- **Bóveda del titular** (driver `stellar`): la credencial firmada y sus divulgaciones se guardan
  cifradas con AES-256-GCM (`BOVEDA_CLAVE`), indexadas por la cuenta del titular, y solo se leen
  con una sesión del titular. Con el driver `acta` la credencial también queda en la bóveda ACTA.
- **Redis** queda para datos operativos (desafíos y sesiones), como indica la Tabla 7.
- **Presentaciones**: no se guardan. El enlace lleva la presentación en el fragmento de la URL
  (`#...`), que el navegador no envía al servidor; el verificador la manda a la API solo para
  verificarla y la API no la persiste.

## Limitación conocida

Mientras la bóveda viva en la API, la plataforma custodia la copia cifrada. La meta del entregable
es que la bóveda sea de ACTA; ver ADR 0001.
