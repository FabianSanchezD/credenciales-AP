import { AlmacenTemporalMemoria } from './almacen-temporal.js';

describe('AlmacenTemporalMemoria', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('guarda, lee y borra valores', async () => {
    const almacen = new AlmacenTemporalMemoria();
    await almacen.set('a', '1', 60);
    await expect(almacen.get('a')).resolves.toBe('1');
    await almacen.delete('a');
    await expect(almacen.get('a')).resolves.toBeNull();
  });

  it('olvida los valores vencidos', async () => {
    vi.useFakeTimers();
    const almacen = new AlmacenTemporalMemoria();
    await almacen.set('a', '1', 5);
    vi.advanceTimersByTime(6000);
    await expect(almacen.get('a')).resolves.toBeNull();
  });
});
