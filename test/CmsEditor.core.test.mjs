import { describe, it, expect } from 'vitest';

import {
  parseRowsIntoSections,
  autoCorrectRows
} from '../js/components/CmsEditor.mjs';

describe('parseRowsIntoSections', () => {
  it('partitions keys into unitInfo, program, general based on canonical sets', () => {
    const rows = [
      { key: 'unitName', value: 'Ward' },
      { key: 'presiding', value: 'Bishop' },
      { key: 'horizontalLine', value: 'Announcements' },
      { key: 'oilLamp', value: '' },
      { key: 'photo', value: 'url|caption' },
      { key: 'leader', value: 'John|Bishop|123' },
      { key: 'someUnknown', value: 'ignored' }
    ];
    const { unitInfoRows, programRows, generalRows } = parseRowsIntoSections(rows);
    expect(unitInfoRows.map(r => r.key)).toEqual(['unitName']);
    // Universal keys (horizontalLine, oilLamp, photo) appear in program before any general key
    expect(programRows.map(r => r.key)).toEqual(['presiding', 'horizontalLine', 'oilLamp', 'photo']);
    // leader (general-only) and unknown key go to general
    expect(generalRows.map(r => r.key)).toEqual(['leader', 'someUnknown']);
  });

  it('places universal keys in program until first non-universal non-program key appears', () => {
    const rows = [
      { key: 'presiding', value: '' },
      { key: 'horizontalLine', value: 'First' },
      { key: 'Opening Prayer', value: '' }, // invalid unknown, goes to general after universal
      { key: 'oilLamp', value: '' },
      { key: 'leader', value: '' }
    ];
    const { unitInfoRows, programRows, generalRows } = parseRowsIntoSections(rows);
    expect(programRows.map(r => r.key)).toEqual(['presiding', 'horizontalLine']);
    expect(generalRows.map(r => r.key)).toEqual(['Opening Prayer', 'oilLamp', 'leader']);
  });

  it('ensures all unit info keys appear in unitInfo section regardless of order', () => {
    const rows = [
      { key: 'date', value: 'May 20' },
      { key: 'unitName', value: '' },
      { key: 'stakeName', value: '' },
      { key: 'unitAddress', value: '' },
      { key: 'link', value: '' },
      { key: 'obsolete', value: '' },
      { key: 'migrationUrl', value: '' }
    ];
    const { unitInfoRows } = parseRowsIntoSections(rows);
    const keys = unitInfoRows.map(r => r.key);
    // Should contain all unit info keys exactly once, and order preserved as in input
    expect(keys).toEqual(['date', 'unitName', 'stakeName', 'unitAddress', 'link', 'obsolete', 'migrationUrl']);
  });
});

describe('autoCorrectRows', () => {
  it('adds missing presiding at start and closingPrayer at end', () => {
    const unitInfoRows = [];
    const programRows = [{ key: 'openingHymn', value: '' }];
    const generalRows = [];
    const { corrections, programRows: correctedProgram } = autoCorrectRows(unitInfoRows, programRows, generalRows);
    expect(corrections).toHaveLength(2);
    expect(correctedProgram[0].key).toBe('presiding');
    expect(correctedProgram[correctedProgram.length - 1].key).toBe('closingPrayer');
  });

  it('reorders presiding after any leading agenda keys', () => {
    const programRows = [
      { key: 'agendaGeneral', value: '' },
      { key: 'presiding', value: '' }
    ];
    autoCorrectRows([], programRows, []);
    expect(programRows[0].key).toBe('agendaGeneral');
    expect(programRows[1].key).toBe('presiding');
  });

  it('reorders closingPrayer to last, after all keys', () => {
    // Include required presiding to avoid insertion shifting indices
    const programRows = [
      { key: 'presiding', value: '' },
      { key: 'closingPrayer', value: '' },
      { key: 'openingHymn', value: '' }
    ];
    autoCorrectRows([], programRows, []);
    expect(programRows[programRows.length - 1].key).toBe('closingPrayer');
  });

  it('removes extra unitInfo rows not in UNIT_INFO_KEYS and moves them to appropriate section', () => {
    const unitInfoRows = [
      { key: 'unitName', value: '' },
      { key: 'invalidKey', value: '' }
    ];
    const programRows = [];
    const generalRows = [];
    autoCorrectRows(unitInfoRows, programRows, generalRows);
    expect(unitInfoRows.map(r => r.key)).toEqual(['unitName']);
    // auto-correct adds required presiding and closingPrayer when missing
    expect(programRows.map(r => r.key)).toEqual(['presiding', 'closingPrayer']);
    expect(generalRows.map(r => r.key)).toEqual(['invalidKey']);
  });

  it('sorts unitInfo rows to exactly UNIT_INFO_KEYS order', () => {
    const unitInfoRows = [
      { key: 'date', value: '' },
      { key: 'unitName', value: '' },
      { key: 'stakeName', value: '' },
      { key: 'obsolete', value: '' },
      { key: 'migrationUrl', value: '' },
      { key: 'unitAddress', value: '' },
      { key: 'link', value: '' }
    ];
    autoCorrectRows(unitInfoRows, [], []);
    const keys = unitInfoRows.map(r => r.key);
    expect(keys).toEqual([
      'unitName',
      'stakeName',
      'obsolete',
      'migrationUrl',
      'unitAddress',
      'link',
      'date'
    ]);
  });
});
