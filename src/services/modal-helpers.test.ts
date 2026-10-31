import {
  STANDARD_DOSES,
  MIN_WEIGHT_KG,
  MAX_WEIGHT_KG,
  SYMPTOM_OPTIONS,
  SEVERITY_LEVELS,
  validateInjectionInput,
  parseDoseInput,
  validateWeightInput,
  parseWeightInput,
  adjustWeight,
  validateSymptomInput,
} from './modal-helpers';

describe('Modal Validation and Logic Helpers', () => {
  describe('Injection Helpers', () => {
    it('contains standard GLP-1/GIP dosage presets', () => {
      expect(STANDARD_DOSES).toContain(0.25);
      expect(STANDARD_DOSES).toContain(0.5);
      expect(STANDARD_DOSES).toContain(1.0);
      expect(STANDARD_DOSES).toContain(2.4);
      expect(STANDARD_DOSES).toContain(2.5);
      expect(STANDARD_DOSES).toContain(15.0);
    });

    it('validates correct injection input successfully', () => {
      const result = validateInjectionInput('med-1', 2.5, 'abdomen_left');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('rejects missing medicationId', () => {
      const result = validateInjectionInput('', 2.5, 'abdomen_left');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Lütfen bir ilaç seçin.');
    });

    it('rejects dose <= 0 or NaN', () => {
      expect(validateInjectionInput('med-1', 0, 'abdomen_left').isValid).toBe(false);
      expect(validateInjectionInput('med-1', -1, 'abdomen_left').isValid).toBe(false);
      expect(validateInjectionInput('med-1', NaN, 'abdomen_left').isValid).toBe(false);
    });

    it('rejects unreasonably high dose (> 50 mg)', () => {
      const result = validateInjectionInput('med-1', 55, 'abdomen_left');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('50');
    });

    it('rejects invalid or missing injection site', () => {
      expect(validateInjectionInput('med-1', 2.5, '').isValid).toBe(false);
      expect(validateInjectionInput('med-1', 2.5, 'invalid_site').isValid).toBe(false);
    });

    it('parses dose input strings with comma or dot correctly', () => {
      expect(parseDoseInput('2.5')).toBe(2.5);
      expect(parseDoseInput('2,5')).toBe(2.5);
      expect(parseDoseInput(' 0.5 ')).toBe(0.5);
      expect(parseDoseInput('abc')).toBeNull();
      expect(parseDoseInput('-5')).toBeNull();
      expect(parseDoseInput('')).toBeNull();
    });
  });

  describe('Weight Helpers', () => {
    it('validates weight within 30 to 300 kg', () => {
      expect(validateWeightInput(75.5).isValid).toBe(true);
      expect(validateWeightInput(30).isValid).toBe(true);
      expect(validateWeightInput(300).isValid).toBe(true);
    });

    it('rejects weight below 30 kg or above 300 kg', () => {
      const under = validateWeightInput(29.9);
      expect(under.isValid).toBe(false);
      expect(under.error).toContain('30');

      const over = validateWeightInput(300.1);
      expect(over.isValid).toBe(false);
      expect(over.error).toContain('300');
    });

    it('rejects NaN or undefined weight', () => {
      expect(validateWeightInput(NaN).isValid).toBe(false);
      expect(validateWeightInput(undefined).isValid).toBe(false);
    });

    it('parses weight strings with decimal comma or point', () => {
      expect(parseWeightInput('82.4')).toBe(82.4);
      expect(parseWeightInput('82,4')).toBe(82.4);
      expect(parseWeightInput('  90 ')).toBe(90);
      expect(parseWeightInput('')).toBeNull();
      expect(parseWeightInput('invalid')).toBeNull();
    });

    it('adjusts weight by delta cleanly without floating point inaccuracies', () => {
      expect(adjustWeight(70.0, 0.1)).toBe(70.1);
      expect(adjustWeight(70.0, -0.1)).toBe(69.9);
      expect(adjustWeight(70.0, 0.5)).toBe(70.5);
      expect(adjustWeight(70.0, -0.5)).toBe(69.5);
      // Floating point check: 70.1 + 0.2 -> 70.3 instead of 70.30000000000001
      expect(adjustWeight(70.1, 0.2)).toBe(70.3);
    });

    it('clamps weight adjustments within [MIN_WEIGHT_KG, MAX_WEIGHT_KG]', () => {
      expect(adjustWeight(MIN_WEIGHT_KG, -1)).toBe(MIN_WEIGHT_KG);
      expect(adjustWeight(MAX_WEIGHT_KG, 5)).toBe(MAX_WEIGHT_KG);
    });
  });

  describe('Symptom Helpers', () => {
    it('contains all 6 required symptom options with Turkish labels', () => {
      const types = SYMPTOM_OPTIONS.map((opt) => opt.type);
      expect(types).toEqual([
        'nausea',
        'fatigue',
        'headache',
        'acid_reflux',
        'constipation',
        'other',
      ]);
      expect(SYMPTOM_OPTIONS.find((s) => s.type === 'nausea')?.label).toBe('Mide Bulantısı');
      expect(SYMPTOM_OPTIONS.find((s) => s.type === 'fatigue')?.label).toBe('Yorgunluk');
      expect(SYMPTOM_OPTIONS.find((s) => s.type === 'headache')?.label).toBe('Baş Ağrısı');
      expect(SYMPTOM_OPTIONS.find((s) => s.type === 'acid_reflux')?.label).toBe(
        'Mide Yanması / Reflü'
      );
      expect(SYMPTOM_OPTIONS.find((s) => s.type === 'constipation')?.label).toBe('Kabızlık');
      expect(SYMPTOM_OPTIONS.find((s) => s.type === 'other')?.label).toBe('Diğer');
    });

    it('contains 5 severity rating levels from 1 (Hafif) to 5 (Çok Şiddetli)', () => {
      expect(SEVERITY_LEVELS).toHaveLength(5);
      expect(SEVERITY_LEVELS[0]).toMatchObject({ level: 1, label: 'Hafif' });
      expect(SEVERITY_LEVELS[4]).toMatchObject({ level: 5, label: 'Çok Şiddetli' });
    });

    it('validates valid symptom input', () => {
      expect(validateSymptomInput('nausea', 1).isValid).toBe(true);
      expect(validateSymptomInput('fatigue', 5).isValid).toBe(true);
    });

    it('rejects invalid symptom type', () => {
      expect(validateSymptomInput('unknown', 3).isValid).toBe(false);
      expect(validateSymptomInput('', 3).isValid).toBe(false);
    });

    it('rejects invalid severity outside 1..5', () => {
      expect(validateSymptomInput('nausea', 0).isValid).toBe(false);
      expect(validateSymptomInput('nausea', 6).isValid).toBe(false);
      expect(validateSymptomInput('nausea', 2.5).isValid).toBe(false);
    });
  });
});
