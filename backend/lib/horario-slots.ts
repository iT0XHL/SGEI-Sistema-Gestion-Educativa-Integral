// ============================================================
//  lib/horario-slots.ts
//  Motor de generación de la jornada escolar de un nivel.
//
//  Enfoque: Recreo y Refrigerio/Almuerzo son anclas FIJAS e
//  inamovibles (las define el Admin a cualquier hora, sin
//  restricción de alineación). Los bloques de clase se calculan
//  en 3 zonas independientes alrededor de esas anclas:
//
//    Zona 1 — desde el Recreo hacia atrás hasta la hora de inicio
//             de la jornada. Se cuenta en bloques completos de
//             duracion_hora_min contando HACIA ATRÁS desde el
//             inicio del Recreo; si al llegar al límite (hora de
//             inicio) sobran minutos, el primer bloque del día
//             (el más alejado del Recreo) absorbe el residuo y
//             queda más corto que duracion_hora_min.
//    Zona 2 — desde el fin del Recreo hacia adelante hasta el
//             inicio del Refrigerio. Se cuenta HACIA ADELANTE
//             desde el fin del Recreo; el residuo (si lo hay) lo
//             absorbe el último bloque de la zona (el más cercano
//             al Refrigerio).
//    Zona 3 — desde el fin del Refrigerio hacia adelante, tantos
//             bloques como falten para completar totalHorasDia
//             (zona1.length + zona2.length + zona3.length =
//             totalHorasDia).
//
//  Función pura — se duplica intencionalmente en
//  frontend/src/app/components/horarios/horarioSlots.ts.
// ============================================================

export interface FranjaDescansoInput {
  tipo: 'RECREO' | 'REFRIGERIO';
  hora_inicio: string; // "HH:MM"
  hora_fin: string;    // "HH:MM"
}

export interface Franja {
  numero: number;
  hora_inicio: string;
  hora_fin: string;
  tipo: 'CLASE' | 'RECREO' | 'REFRIGERIO';
  duracion_minutos: number;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
}

function toHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Puntos de corte contando HACIA ATRÁS desde `ancla`, sin pasar de `limite` (el primer punto se clampa ahí, absorbiendo el residuo). Ascendente. */
function puntosHaciaAtras(ancla: number, limite: number, duracion: number): number[] {
  const puntos = [ancla];
  while (puntos[0]! - duracion > limite) {
    puntos.unshift(puntos[0]! - duracion);
  }
  if (puntos[0] !== limite) puntos.unshift(limite);
  return puntos;
}

/** Puntos de corte contando HACIA ADELANTE desde `ancla`, sin pasar de `limite` (el último punto se clampa ahí, absorbiendo el residuo). Ascendente. */
function puntosHaciaAdelante(ancla: number, limite: number, duracion: number): number[] {
  const puntos = [ancla];
  while (puntos[puntos.length - 1]! + duracion < limite) {
    puntos.push(puntos[puntos.length - 1]! + duracion);
  }
  if (puntos[puntos.length - 1] !== limite) puntos.push(limite);
  return puntos;
}

/** `cantidad` bloques completos de `duracion` contados hacia adelante desde `inicio`. */
function puntosPorConteo(inicio: number, duracion: number, cantidad: number): number[] {
  const puntos = [inicio];
  for (let i = 0; i < cantidad; i++) puntos.push(puntos[puntos.length - 1]! + duracion);
  return puntos;
}

function bloquesDePuntos(puntos: number[]): Array<{ inicio: number; fin: number }> {
  const bloques: Array<{ inicio: number; fin: number }> = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    if (puntos[i + 1]! > puntos[i]!) bloques.push({ inicio: puntos[i]!, fin: puntos[i + 1]! });
  }
  return bloques;
}

/**
 * Genera la jornada completa de un nivel: bloques de clase + Recreo +
 * Refrigerio, en orden cronológico, numerados.
 */
export function generarFranjas(
  horaInicioJornada: string,
  duracionHoraMin: number,
  descansos: FranjaDescansoInput[],
  totalHorasDia = 8,
): Franja[] {
  const recreo = descansos.find((d) => d.tipo === 'RECREO');
  const refrigerio = descansos.find((d) => d.tipo === 'REFRIGERIO');
  const horaInicioMin = toMin(horaInicioJornada);

  // Sin ambas anclas configuradas: bloques consecutivos simples desde el inicio.
  if (!recreo || !refrigerio) {
    const bloques = bloquesDePuntos(puntosPorConteo(horaInicioMin, duracionHoraMin, totalHorasDia));
    return bloques.map((b, i) => ({
      numero: i + 1,
      hora_inicio: toHHMM(b.inicio),
      hora_fin: toHHMM(b.fin),
      tipo: 'CLASE' as const,
      duracion_minutos: b.fin - b.inicio,
    }));
  }

  const recreoInicioMin = toMin(recreo.hora_inicio);
  const recreoFinMin = toMin(recreo.hora_fin);
  const refrigerioInicioMin = toMin(refrigerio.hora_inicio);
  const refrigerioFinMin = toMin(refrigerio.hora_fin);

  const zona1 = bloquesDePuntos(puntosHaciaAtras(recreoInicioMin, horaInicioMin, duracionHoraMin));
  const zona2 = bloquesDePuntos(puntosHaciaAdelante(recreoFinMin, refrigerioInicioMin, duracionHoraMin));
  const zona3Cantidad = Math.max(0, totalHorasDia - zona1.length - zona2.length);
  const zona3 = bloquesDePuntos(puntosPorConteo(refrigerioFinMin, duracionHoraMin, zona3Cantidad));

  const resultado: Franja[] = [];
  let numero = 1;
  for (const b of zona1) {
    resultado.push({ numero: numero++, hora_inicio: toHHMM(b.inicio), hora_fin: toHHMM(b.fin), tipo: 'CLASE', duracion_minutos: b.fin - b.inicio });
  }
  resultado.push({ numero: numero++, hora_inicio: recreo.hora_inicio, hora_fin: recreo.hora_fin, tipo: 'RECREO', duracion_minutos: recreoFinMin - recreoInicioMin });
  for (const b of zona2) {
    resultado.push({ numero: numero++, hora_inicio: toHHMM(b.inicio), hora_fin: toHHMM(b.fin), tipo: 'CLASE', duracion_minutos: b.fin - b.inicio });
  }
  resultado.push({ numero: numero++, hora_inicio: refrigerio.hora_inicio, hora_fin: refrigerio.hora_fin, tipo: 'REFRIGERIO', duracion_minutos: refrigerioFinMin - refrigerioInicioMin });
  for (const b of zona3) {
    resultado.push({ numero: numero++, hora_inicio: toHHMM(b.inicio), hora_fin: toHHMM(b.fin), tipo: 'CLASE', duracion_minutos: b.fin - b.inicio });
  }

  return resultado;
}

/** Aplana y ordena las franjas de varios niveles (docente que enseña en más de un nivel). */
export function mergeFranjas(porNivel: Franja[][]): Franja[] {
  const todas = porNivel.flat();
  const vistos = new Set<string>();
  const unicas: Franja[] = [];
  for (const f of todas) {
    const key = `${f.tipo}-${f.hora_inicio}-${f.hora_fin}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    unicas.push(f);
  }
  return unicas
    .sort((a, b) => toMin(a.hora_inicio) - toMin(b.hora_inicio))
    .map((f, i) => ({ ...f, numero: i + 1 }));
}
