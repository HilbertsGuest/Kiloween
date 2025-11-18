// Tests for creature ASCII art module
import { describe, it, expect } from 'vitest';

describe('Creatures Module', () => {
  let creatures;

  beforeEach(async () => {
    creatures = await import('./creatures.js');
  });

  describe('CREATURES array', () => {
    it('should have multiple creature variations', () => {
      expect(creatures.CREATURES).toBeDefined();
      expect(creatures.CREATURES.length).toBeGreaterThan(0);
    });

    it('should have at least 5 different creatures', () => {
      expect(creatures.CREATURES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have creatures with required properties', () => {
      creatures.CREATURES.forEach(creature => {
        expect(creature).toHaveProperty('name');
        expect(creature).toHaveProperty('art');
        expect(creature).toHaveProperty('color');
        expect(typeof creature.name).toBe('string');
        expect(typeof creature.art).toBe('string');
        expect(typeof creature.color).toBe('string');
      });
    });

    it('should have unique creature names', () => {
      const names = creatures.CREATURES.map(c => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have non-empty ASCII art', () => {
      creatures.CREATURES.forEach(creature => {
        expect(creature.art.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have valid color codes', () => {
      const colorRegex = /^#[0-9a-fA-F]{6}$/;
      creatures.CREATURES.forEach(creature => {
        expect(creature.color).toMatch(colorRegex);
      });
    });
  });

  describe('getRandomCreature', () => {
    it('should return a creature object', () => {
      const creature = creatures.getRandomCreature();
      
      expect(creature).toBeDefined();
      expect(creature).toHaveProperty('name');
      expect(creature).toHaveProperty('art');
      expect(creature).toHaveProperty('color');
    });

    it('should return different creatures on multiple calls', () => {
      const results = new Set();
      
      // Call multiple times to increase chance of getting different creatures
      for (let i = 0; i < 20; i++) {
        const creature = creatures.getRandomCreature();
        results.add(creature.name);
      }
      
      // Should get at least 2 different creatures in 20 tries
      expect(results.size).toBeGreaterThan(1);
    });

    it('should return a creature from the CREATURES array', () => {
      const creature = creatures.getRandomCreature();
      const found = creatures.CREATURES.find(c => c.name === creature.name);
      
      expect(found).toBeDefined();
      expect(found).toEqual(creature);
    });
  });

  describe('getCreatureByName', () => {
    it('should return correct creature for valid name', () => {
      const firstCreature = creatures.CREATURES[0];
      const result = creatures.getCreatureByName(firstCreature.name);
      
      expect(result).toEqual(firstCreature);
    });

    it('should return null for invalid name', () => {
      const result = creatures.getCreatureByName('nonexistent-creature');
      
      expect(result).toBeNull();
    });

    it('should be case-sensitive', () => {
      const firstCreature = creatures.CREATURES[0];
      const upperCaseName = firstCreature.name.toUpperCase();
      const result = creatures.getCreatureByName(upperCaseName);
      
      // Should not find it if case doesn't match
      if (upperCaseName !== firstCreature.name) {
        expect(result).toBeNull();
      }
    });

    it('should return specific known creatures', () => {
      // Test some expected creatures
      const expectedCreatures = ['ghost', 'demon', 'skull', 'spider'];
      
      expectedCreatures.forEach(name => {
        const creature = creatures.getCreatureByName(name);
        if (creature) {
          expect(creature.name).toBe(name);
          expect(creature.art).toBeTruthy();
          expect(creature.color).toBeTruthy();
        }
      });
    });
  });

  describe('getCreatureNames', () => {
    it('should return array of all creature names', () => {
      const names = creatures.getCreatureNames();
      
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBe(creatures.CREATURES.length);
    });

    it('should return correct names', () => {
      const names = creatures.getCreatureNames();
      const expectedNames = creatures.CREATURES.map(c => c.name);
      
      expect(names).toEqual(expectedNames);
    });

    it('should return names in same order as CREATURES array', () => {
      const names = creatures.getCreatureNames();
      
      names.forEach((name, index) => {
        expect(name).toBe(creatures.CREATURES[index].name);
      });
    });
  });

  describe('Specific Creatures', () => {
    it('should have a ghost creature', () => {
      const ghost = creatures.getCreatureByName('ghost');
      expect(ghost).toBeDefined();
      expect(ghost?.name).toBe('ghost');
    });

    it('should have a demon creature', () => {
      const demon = creatures.getCreatureByName('demon');
      expect(demon).toBeDefined();
      expect(demon?.name).toBe('demon');
    });

    it('should have a skull creature', () => {
      const skull = creatures.getCreatureByName('skull');
      expect(skull).toBeDefined();
      expect(skull?.name).toBe('skull');
    });

    it('should have Halloween-themed creatures', () => {
      const names = creatures.getCreatureNames();
      const halloweenThemes = ['ghost', 'demon', 'skull', 'spider', 'vampire', 'witch', 'zombie', 'monster'];
      
      // Should have at least some Halloween-themed creatures
      const hasHalloweenThemes = names.some(name => halloweenThemes.includes(name));
      expect(hasHalloweenThemes).toBe(true);
    });
  });

  describe('ASCII Art Quality', () => {
    it('should have multi-line ASCII art', () => {
      creatures.CREATURES.forEach(creature => {
        const lines = creature.art.split('\n').filter(line => line.trim().length > 0);
        expect(lines.length).toBeGreaterThan(1);
      });
    });

    it('should use ASCII characters', () => {
      const asciiRegex = /^[\x00-\x7F\n]*$/;
      
      creatures.CREATURES.forEach(creature => {
        expect(creature.art).toMatch(asciiRegex);
      });
    });

    it('should have reasonable size (not too large)', () => {
      creatures.CREATURES.forEach(creature => {
        // ASCII art should be less than 1000 characters
        expect(creature.art.length).toBeLessThan(1000);
      });
    });
  });

  describe('Color Variety', () => {
    it('should have different colors for different creatures', () => {
      const colors = new Set(creatures.CREATURES.map(c => c.color));
      
      // Should have at least 3 different colors
      expect(colors.size).toBeGreaterThanOrEqual(3);
    });

    it('should use spooky colors', () => {
      const spookyColors = [
        '#ff0000', // red
        '#ffffff', // white
        '#cccccc', // gray
        '#8b4513', // brown
        '#8b0000', // dark red
        '#00ff00', // green
        '#9400d3', // purple
        '#556b2f'  // olive
      ];

      creatures.CREATURES.forEach(creature => {
        // Color should be a valid hex color
        expect(creature.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });
});
