import { describe, it, expect } from 'vitest';
import {
  MODEL_PRESETS,
  getModelPreset,
  calculateEffectiveBudget,
  calculatePresetCost,
  getModelWarnings,
  listModelPresets,
  getPresetsByFamily,
} from './modelPresets.js';

describe('Model Presets', () => {
  describe('MODEL_PRESETS', () => {
    it('should have all expected models', () => {
      expect(MODEL_PRESETS['gpt-5.1']).toBeDefined();
      expect(MODEL_PRESETS['gpt-5.1-thinking']).toBeDefined();
      expect(MODEL_PRESETS['gpt-4.1']).toBeDefined();
      expect(MODEL_PRESETS['gpt-o3']).toBeDefined();
      expect(MODEL_PRESETS['gpt-o3-mini']).toBeDefined();
      expect(MODEL_PRESETS['claude-3.5-sonnet']).toBeDefined();
      expect(MODEL_PRESETS['claude-3.5-opus']).toBeDefined();
      expect(MODEL_PRESETS['claude-3.5-haiku']).toBeDefined();
      expect(MODEL_PRESETS['gemini-1.5-pro']).toBeDefined();
      expect(MODEL_PRESETS['gemini-2.0-flash']).toBeDefined();
    });

    it('should have valid context limits for all models', () => {
      for (const preset of Object.values(MODEL_PRESETS)) {
        expect(preset.contextLimit).toBeGreaterThan(0);
        expect(preset.contextLimit).toBeLessThanOrEqual(2_000_000);
      }
    });

    it('should have valid safety margins', () => {
      for (const preset of Object.values(MODEL_PRESETS)) {
        expect(preset.safetyMargin).toBeGreaterThan(0);
        expect(preset.safetyMargin).toBeLessThanOrEqual(1);
      }
    });

    it('should have valid cost information', () => {
      for (const preset of Object.values(MODEL_PRESETS)) {
        expect(preset.inputCostPerMillion).toBeGreaterThanOrEqual(0);
        expect(preset.outputCostPerMillion).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getModelPreset', () => {
    it('should get preset by exact name', () => {
      const preset = getModelPreset('claude-3.5-sonnet');
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('claude-3.5-sonnet');
      expect(preset?.displayName).toBe('Claude 3.5 Sonnet');
    });

    it('should get preset case-insensitively', () => {
      const preset = getModelPreset('CLAUDE-3.5-SONNET');
      expect(preset).toBeDefined();
      expect(preset?.name).toBe('claude-3.5-sonnet');
    });

    it('should resolve common aliases', () => {
      expect(getModelPreset('sonnet')?.name).toBe('claude-3.5-sonnet');
      expect(getModelPreset('opus')?.name).toBe('claude-3.5-opus');
      expect(getModelPreset('haiku')?.name).toBe('claude-3.5-haiku');
      expect(getModelPreset('claude')?.name).toBe('claude-3.5-sonnet');
      expect(getModelPreset('gpt5')?.name).toBe('gpt-5.1');
      expect(getModelPreset('gpt4')?.name).toBe('gpt-4.1');
      expect(getModelPreset('o3')?.name).toBe('gpt-o3');
      expect(getModelPreset('gemini')?.name).toBe('gemini-1.5-pro');
      expect(getModelPreset('flash')?.name).toBe('gemini-2.0-flash');
    });

    it('should return undefined for unknown models', () => {
      expect(getModelPreset('unknown-model')).toBeUndefined();
      expect(getModelPreset('')).toBeUndefined();
    });

    it('should trim whitespace from names', () => {
      const preset = getModelPreset('  sonnet  ');
      expect(preset?.name).toBe('claude-3.5-sonnet');
    });
  });

  describe('calculateEffectiveBudget', () => {
    it('should apply safety margin to context limit', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');

      const budget = calculateEffectiveBudget(preset);
      expect(budget).toBe(150_000); // 200K * 0.75
    });

    it('should floor the result', () => {
      const preset = MODEL_PRESETS['gpt-5.1-thinking'];
      if (!preset) throw new Error('Preset not found');

      const budget = calculateEffectiveBudget(preset);
      expect(budget).toBe(166_400); // 256K * 0.65
      expect(Number.isInteger(budget)).toBe(true);
    });

    it('should handle high safety margins', () => {
      const preset = MODEL_PRESETS['gemini-2.0-flash'];
      if (!preset) throw new Error('Preset not found');

      const budget = calculateEffectiveBudget(preset);
      expect(budget).toBe(850_000); // 1M * 0.85
    });
  });

  describe('calculatePresetCost', () => {
    it('should calculate correct input cost', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');

      const result = calculatePresetCost(100_000, preset);
      expect(result.inputCost).toBeCloseTo(0.30, 4); // $3/1M * 100K
    });

    it('should determine within budget correctly', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');

      // 100K is within 150K effective budget
      const withinBudget = calculatePresetCost(100_000, preset);
      expect(withinBudget.withinBudget).toBe(true);

      // 160K exceeds 150K effective budget
      const exceedsBudget = calculatePresetCost(160_000, preset);
      expect(exceedsBudget.withinBudget).toBe(false);
    });

    it('should calculate utilization percentage', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');

      // 75K out of 150K effective budget = 50%
      const result = calculatePresetCost(75_000, preset);
      expect(result.utilizationPercent).toBeCloseTo(50, 1);
    });

    it('should set warning levels correctly', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');
      // Effective budget: 150K

      // Safe: <= 80% of budget (120K)
      const safe = calculatePresetCost(100_000, preset);
      expect(safe.warningLevel).toBe('safe');

      // Caution: 80-100% of budget
      const caution = calculatePresetCost(140_000, preset);
      expect(caution.warningLevel).toBe('caution');

      // Danger: > 100% of budget
      const danger = calculatePresetCost(160_000, preset);
      expect(danger.warningLevel).toBe('danger');
    });
  });

  describe('getModelWarnings', () => {
    it('should warn when exceeding hard context limit', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');

      const warnings = getModelWarnings(250_000, preset);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('hard limit'))).toBe(true);
    });

    it('should warn when exceeding safe budget', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');

      // Exceeds 150K effective but not 200K hard limit
      const warnings = getModelWarnings(160_000, preset);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.includes('safe budget'))).toBe(true);
    });

    it('should warn on high utilization', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');

      // 90%+ of effective budget
      const warnings = getModelWarnings(140_000, preset);
      expect(warnings.some(w => w.includes('High utilization'))).toBe(true);
    });

    it('should return empty array when within safe limits', () => {
      const preset = MODEL_PRESETS['claude-3.5-sonnet'];
      if (!preset) throw new Error('Preset not found');

      const warnings = getModelWarnings(50_000, preset);
      expect(warnings).toEqual([]);
    });
  });

  describe('listModelPresets', () => {
    it('should return all presets as an array', () => {
      const presets = listModelPresets();
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBe(Object.keys(MODEL_PRESETS).length);
    });

    it('should include all required properties', () => {
      const presets = listModelPresets();
      for (const preset of presets) {
        expect(preset.name).toBeDefined();
        expect(preset.displayName).toBeDefined();
        expect(preset.contextLimit).toBeDefined();
        expect(preset.safetyMargin).toBeDefined();
        expect(preset.inputCostPerMillion).toBeDefined();
        expect(preset.outputCostPerMillion).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.family).toBeDefined();
      }
    });
  });

  describe('getPresetsByFamily', () => {
    it('should group presets by family', () => {
      const grouped = getPresetsByFamily();

      expect(grouped['openai']).toBeDefined();
      expect(grouped['anthropic']).toBeDefined();
      expect(grouped['google']).toBeDefined();
    });

    it('should have correct models in each family', () => {
      const grouped = getPresetsByFamily();

      const openaiNames = grouped['openai']?.map(p => p.name) ?? [];
      expect(openaiNames).toContain('gpt-5.1');
      expect(openaiNames).toContain('gpt-4.1');
      expect(openaiNames).toContain('gpt-o3');

      const anthropicNames = grouped['anthropic']?.map(p => p.name) ?? [];
      expect(anthropicNames).toContain('claude-3.5-sonnet');
      expect(anthropicNames).toContain('claude-3.5-opus');
      expect(anthropicNames).toContain('claude-3.5-haiku');

      const googleNames = grouped['google']?.map(p => p.name) ?? [];
      expect(googleNames).toContain('gemini-1.5-pro');
      expect(googleNames).toContain('gemini-2.0-flash');
    });
  });
});
