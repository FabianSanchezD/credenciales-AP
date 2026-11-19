/** Marca del portal: «TEC | Credenciales Verificables». */
export function MarcaTec() {
  return (
    <span className="flex items-center gap-3.5">
      <span aria-label="TEC" className="font-marca text-[2rem] leading-none tracking-[0.01em] text-tec-azul">
        TEC
      </span>
      <span aria-hidden className="h-7 w-[1.5px] bg-tec-rojo" />
      <span className="truncate text-base font-medium text-tec-azul">Credenciales Verificables</span>
    </span>
  );
}
