import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Plugin Manifest Validation', () => {
  let manifest: any;

  beforeAll(() => {
    const manifestPath = path.join(__dirname, '..', 'manifest.json');
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    manifest = JSON.parse(manifestContent);
  });

  describe('Required Fields', () => {
    it('should have valid id field', () => {
      expect(manifest.id).toBeDefined();
      expect(typeof manifest.id).toBe('string');
      expect(manifest.id.length).toBeGreaterThan(0);
      expect(manifest.id).toMatch(/^[a-z0-9-]+$/);
    });

    it('should have valid name field', () => {
      expect(manifest.name).toBeDefined();
      expect(typeof manifest.name).toBe('string');
      expect(manifest.name.length).toBeGreaterThan(0);
    });

    it('should have valid version field', () => {
      expect(manifest.version).toBeDefined();
      expect(typeof manifest.version).toBe('string');
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have valid minAppVersion field', () => {
      expect(manifest.minAppVersion).toBeDefined();
      expect(typeof manifest.minAppVersion).toBe('string');
      expect(manifest.minAppVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have valid description field', () => {
      expect(manifest.description).toBeDefined();
      expect(typeof manifest.description).toBe('string');
      expect(manifest.description.length).toBeGreaterThan(0);
      expect(manifest.description.length).toBeLessThanOrEqual(250);
    });

    it('should have valid author field', () => {
      expect(manifest.author).toBeDefined();
      expect(typeof manifest.author).toBe('string');
    });
  });

  describe('Optional Fields', () => {
    it('should have valid authorUrl if present', () => {
      if (manifest.authorUrl !== undefined) {
        expect(typeof manifest.authorUrl).toBe('string');
      }
    });

    it('should have valid fundingUrl if present', () => {
      if (manifest.fundingUrl !== undefined) {
        expect(typeof manifest.fundingUrl).toBe('string');
      }
    });

    it('should have valid isDesktopOnly field', () => {
      expect(manifest.isDesktopOnly).toBeDefined();
      expect(typeof manifest.isDesktopOnly).toBe('boolean');
    });
  });

  describe('Content Validation', () => {
    it('should have GTD-related description', () => {
      const description = manifest.description.toLowerCase();
      expect(description).toMatch(/gtd|getting things done|productivity|task/);
    });

    it('should have obsidian-gtd as id', () => {
      expect(manifest.id).toBe('obsidian-gtd');
    });

    it('should support both desktop and mobile', () => {
      expect(manifest.isDesktopOnly).toBe(false);
    });
  });
});