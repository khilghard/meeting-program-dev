import { describe, it, expect } from 'vitest';

import {
  normalizeCmsKeyType,
  parseFieldValue,
  serializeFieldValue,
  getFieldsForKeyType,
  parseDisplayDate,
  formatDisplayDate
} from '../js/components/CmsEditor.mjs';

describe('normalizeCmsKeyType', () => {
  it('removes trailing numbers from repeatable keys', () => {
    expect(normalizeCmsKeyType('speaker1')).toBe('speaker');
    expect(normalizeCmsKeyType('intermediateHymn2')).toBe('intermediateHymn');
    expect(normalizeCmsKeyType('leader10')).toBe('leader');
  });

  it('returns original key if no trailing number', () => {
    expect(normalizeCmsKeyType('unitName')).toBe('unitName');
    expect(normalizeCmsKeyType('presiding')).toBe('presiding');
  });
});

describe('parseFieldValue and serializeFieldValue round-trip', () => {
  const testRoundTrip = (key, valueObj) => {
    const serialized = serializeFieldValue(key, valueObj);
    const parsed = parseFieldValue(key, serialized);
    expect(parsed).toEqual(valueObj);
  };

  it('handles simple text fields (unitName, stakeName, etc)', () => {
    testRoundTrip('unitName', { text: '1st Ward' });
    testRoundTrip('stakeName', { text: 'Stake Name' });
    testRoundTrip('unitAddress', { text: '123 Main St' });
  });

  it('handles date field', () => {
    testRoundTrip('date', { text: 'March 29, 2026' });
  });

  it('handles speaker (name + caption)', () => {
    testRoundTrip('speaker', { name: 'Sister Johnson', caption: 'Youth Speaker' });
    testRoundTrip('speaker', { name: 'Bishop Smith', caption: '' });
  });

  it('handles leader (name, calling, phone)', () => {
    testRoundTrip('leader', {
      name: 'John Doe',
      calling: 'Bishop',
      phone: '(000) 000-0000'
    });
  });

  it('handles hymn fields (hymnNumber only)', () => {
    testRoundTrip('openingHymn', { hymnNumber: '62' });
    testRoundTrip('sacramentHymn', { hymnNumber: 'CS 2' });
  });

  it('handles generalStatementWithLink (text + url, <LINK> auto-added on save)', () => {
    // User enters text without <LINK> token
    const value = { text: 'Read more', url: 'https://example.org' };
    // Serialization adds <LINK> token
    const serialized = serializeFieldValue('generalStatementWithLink', value);
    expect(serialized).toBe('Read more<LINK>|https://example.org');
    // Parsing strips <LINK> token back out
    const parsed = parseFieldValue('generalStatementWithLink', serialized);
    expect(parsed).toEqual({ text: 'Read more', url: 'https://example.org' });
  });

  it('handles linkWithSpace (text + url + imageUrl, <IMG> auto-added on save)', () => {
    // User enters text without <IMG> token
    const value = { text: 'Gospel Library', url: 'https://example.org', imageUrl: 'https://img.url' };
    // Serialization adds <IMG> token
    const serialized = serializeFieldValue('linkWithSpace', value);
    expect(serialized).toBe('<IMG> Gospel Library|https://example.org|https://img.url');
    // Parsing strips <IMG> token back out
    const parsed = parseFieldValue('linkWithSpace', serialized);
    expect(parsed).toEqual({ text: 'Gospel Library', url: 'https://example.org', imageUrl: 'https://img.url' });
  });

  it('handles photo (url + caption)', () => {
    testRoundTrip('photo', {
      url: 'https://example.com/photo.jpg',
      caption: 'Ward Family Photo'
    });
    testRoundTrip('photo', {
      url: 'https://example.com/photo.jpg',
      caption: ''
    });
  });

  it('handles photo locale pairs (url + optional caption per locale)', () => {
    testRoundTrip('photo', {
      url: 'https://example.com/photo-en.jpg',
      caption: 'EN Caption',
      url_es: 'https://example.com/photo-es.jpg',
      caption_es: 'ES Caption',
      url_fr: '',
      caption_fr: '',
      url_swa: 'https://example.com/photo-swa.jpg',
      caption_swa: ''
    });
  });

    it('handles oilLamp with optional caption', () => {
      testRoundTrip('oilLamp', { enabled: true, caption: 'Let your light so shine' });
      expect(parseFieldValue('oilLamp', 'true')).toEqual({ enabled: true, caption: '' });
      expect(serializeFieldValue('oilLamp', { enabled: true, caption: 'Evening Devotional' })).toBe(
        'Evening Devotional'
      );
    });

  it('handles textarea fields (agendaGeneral, generalStatement)', () => {
    testRoundTrip('agendaGeneral', { text: 'Some notes' });
    testRoundTrip('generalStatement', { text: 'Activity Night' });
  });
});

describe('date utilities', () => {
  it('parseDisplayDate converts English long date to ISO', () => {
    expect(parseDisplayDate('March 29, 2026')).toBe('2026-03-29');
    expect(parseDisplayDate('January 1, 2025')).toBe('2025-01-01');
    expect(parseDisplayDate('')).toBe('');
    expect(parseDisplayDate('invalid')).toBe('');
  });

  it('formatDisplayDate converts ISO to display format', () => {
    expect(formatDisplayDate('2026-03-29')).toBe('March 29, 2026');
    expect(formatDisplayDate('2025-01-01')).toBe('January 1, 2025');
    expect(formatDisplayDate('')).toBe('');
    expect(formatDisplayDate('invalid')).toBe('');
  });
});

describe('getFieldsForKeyType', () => {
  it('returns field definitions for known keys', () => {
    const fields = getFieldsForKeyType('unitName');
    expect(fields).toEqual([{ name: 'text', type: 'text', placeholder: 'cms.input.wardBranchName' }]);
  });

  it('returns default field for unknown keys', () => {
    const fields = getFieldsForKeyType('unknownKey');
    expect(fields).toEqual([{ name: 'text', type: 'text', placeholder: 'cms.input.value' }]);
  });

  it('returns multiple fields for complex keys', () => {
    const leaderFields = getFieldsForKeyType('leader');
    expect(leaderFields.length).toBe(3);
    expect(leaderFields.some(f => f.name === 'name')).toBe(true);
    expect(leaderFields.some(f => f.name === 'calling')).toBe(true);
    expect(leaderFields.some(f => f.name === 'phone')).toBe(true);
  });

  it('includes date picker for date key', () => {
    const dateFields = getFieldsForKeyType('date');
    expect(dateFields[0].type).toBe('date');
  });

  it('includes optional caption text field for oilLamp', () => {
    const oilFields = getFieldsForKeyType('oilLamp');
    expect(oilFields[0].type).toBe('text');
    expect(oilFields[0].name).toBe('caption');
  });
});
