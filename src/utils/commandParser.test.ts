import { describe, expect, it } from 'vitest';
import {
  extractContext,
  extractFeel,
  extractPoolLength,
  extractSwimEvent,
  extractTime,
  parseQuickSwimCommand,
} from './commandParser';

describe('commandParser - Extracción de componentes de natación', () => {
  it('detecta estilos y distancias correctamente', () => {
    expect(extractSwimEvent('hice 50 libre en 26.40')).toBe('50-free');
    expect(extractSwimEvent('100 mariposa 1:02.15')).toBe('100-fly');
    expect(extractSwimEvent('200 espalda 2:15.30')).toBe('200-back');
    expect(extractSwimEvent('200 pecho 2:25.80')).toBe('200-breast');
    expect(extractSwimEvent('100 combinado 1:04.20')).toBe('100-medley');
    expect(extractSwimEvent('400 libre 4:10.00')).toBe('400-free');
    expect(extractSwimEvent('1500 libre 16:30.00')).toBe('1500-free');
  });

  it('detecta el tamaño de pileta (25m o 50m)', () => {
    expect(extractPoolLength('50 libre 26.40 en 25m', 50)).toBe(25);
    expect(extractPoolLength('50 libre 26.40 pileta de 50', 25)).toBe(50);
    expect(extractPoolLength('100 mariposa pileta olimpica', 25)).toBe(50);
    expect(extractPoolLength('100 mariposa pileta corta', 50)).toBe(25);
    expect(extractPoolLength('50 libre 26.40', 25)).toBe(25);
    expect(extractPoolLength('50 libre 26.40', 50)).toBe(50);
  });

  it('detecta contexto (carrera vs entrenamiento)', () => {
    expect(extractContext('torneo cenard 50 libre')).toBe('race');
    expect(extractContext('entrenamiento 100 mariposa')).toBe('training');
    expect(extractContext('entreno 200 pecho')).toBe('training');
    expect(extractContext('50 libre 26.40')).toBe('race');
  });

  it('detecta sensación en el agua (1 a 5)', () => {
    expect(extractFeel('50 libre 26.40 sensacion 4')).toBe(4);
    expect(extractFeel('100 mariposa feel 5')).toBe(5);
    expect(extractFeel('200 pecho sintiendome 3 en el agua')).toBe(3);
    expect(extractFeel('50 libre sin nota')).toBeUndefined();
  });

  it('extrae tiempos en diferentes formatos numéricos y móviles', () => {
    expect(extractTime('50 libre 26.40')).toBe(26.40);
    expect(extractTime('100 mariposa 1:02.15')).toBe(62.15);
    expect(extractTime('100 mariposa 1.02.15')).toBe(62.15);
    expect(extractTime('200 pecho 2:25.80')).toBe(145.80);
    expect(extractTime('meta sub 25')).toBe(25);
    expect(extractTime('objetivo bajar de 55')).toBe(55);
  });
});

describe('commandParser - parseQuickSwimCommand', () => {
  it('retorna isMatch=false ante textos vacíos o no relacionados', () => {
    expect(parseQuickSwimCommand('')).toEqual({ isMatch: false, rawText: '' });
    expect(parseQuickSwimCommand('hola como estas?').isMatch).toBe(false);
    expect(parseQuickSwimCommand('hoy voy a entrenar').isMatch).toBe(false);
  });

  it('interpreta comando rápido de marca en 25m', () => {
    const res = parseQuickSwimCommand('50 libre 26.40 en 25m');
    expect(res.isMatch).toBe(true);
    expect(res.type).toBe('mark');
    expect(res.draftMark).toBeDefined();
    expect(res.draftMark?.eventId).toBe('50-free');
    expect(res.draftMark?.timeSec).toBe(26.40);
    expect(res.draftMark?.poolLength).toBe(25);
    expect(res.draftMark?.context).toBe('race');
  });

  it('interpreta marca con entrenamiento, sensación y sede', () => {
    const res = parseQuickSwimCommand('entrenamiento 200 pecho 2:25.80 sensacion 4');
    expect(res.isMatch).toBe(true);
    expect(res.type).toBe('mark');
    expect(res.draftMark?.eventId).toBe('200-breast');
    expect(res.draftMark?.timeSec).toBe(145.80);
    expect(res.draftMark?.context).toBe('training');
    expect(res.draftMark?.feel).toBe(4);
  });

  it('interpreta comando rápido de objetivo', () => {
    const res = parseQuickSwimCommand('objetivo 100 libre 54.50 en 50m');
    expect(res.isMatch).toBe(true);
    expect(res.type).toBe('goal');
    expect(res.draftGoal).toBeDefined();
    expect(res.draftGoal?.eventId).toBe('100-free');
    expect(res.draftGoal?.targetTimeSec).toBe(54.50);
    expect(res.draftGoal?.poolLength).toBe(50);
  });

  it('fuerza 100-medley a pileta de 25m aunque se mencione 50m', () => {
    const res = parseQuickSwimCommand('100 combinado 1:02.40 en 50m');
    expect(res.isMatch).toBe(true);
    expect(res.draftMark?.eventId).toBe('100-medley');
    expect(res.draftMark?.poolLength).toBe(25);
  });
});

