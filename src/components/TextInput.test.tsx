import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { TextInput } from './TextInput.js';

describe('TextInput', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('component rendering', () => {
    it('should display the prompt', () => {
      const { lastFrame } = render(
        React.createElement(TextInput, {
          prompt: 'Enter filename:',
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('Enter filename:');
    });

    it('should display placeholder when value is empty', () => {
      const { lastFrame } = render(
        React.createElement(TextInput, {
          prompt: 'Enter filename:',
          placeholder: 'example.txt',
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('example.txt');
    });

    it('should display default value', () => {
      const { lastFrame } = render(
        React.createElement(TextInput, {
          prompt: 'Enter filename:',
          defaultValue: 'output.txt',
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('output.txt');
    });

    it('should show help text with keyboard shortcuts', () => {
      const { lastFrame } = render(
        React.createElement(TextInput, {
          prompt: 'Enter filename:',
          onSubmit: mockOnSubmit,
        })
      );

      const output = lastFrame();
      expect(output).toContain('←→ navigate');
      expect(output).toContain('Enter confirm');
      expect(output).toContain('Esc default');
    });

    it('should show cursor indicator', () => {
      const { lastFrame } = render(
        React.createElement(TextInput, {
          prompt: 'Enter filename:',
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('█');
    });

    it('should display input prompt with > prefix', () => {
      const { lastFrame } = render(
        React.createElement(TextInput, {
          prompt: 'Enter filename:',
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('> ');
    });
  });

  describe('backspace and delete functionality', () => {
    it('should delete character before cursor with backspace', () => {
      const { lastFrame, stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'hello',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\x7F'); // backspace
      expect(lastFrame()).toContain('hell');
    });

    it('should delete multiple characters with repeated backspace', () => {
      const { lastFrame, stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'hello',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\x7F'); // backspace
      stdin.write('\x7F'); // backspace
      stdin.write('\x7F'); // backspace
      expect(lastFrame()).toContain('he');
    });


    it('should not delete when cursor is at start', () => {
      const { lastFrame, stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'hello',
          onSubmit: mockOnSubmit,
        })
      );

      // Move cursor to start
      stdin.write('\x01'); // Ctrl+A
      stdin.write('\x7F'); // backspace

      // Should still contain full text
      expect(lastFrame()).toContain('hello');
    });

    it('should delete character at cursor position with Delete key', () => {
      const { lastFrame, stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'hello',
          onSubmit: mockOnSubmit,
        })
      );

      // Move cursor to start
      stdin.write('\x01'); // Ctrl+A
      stdin.write('\x1B[3~'); // Delete key

      expect(lastFrame()).toContain('ello');
    });

    it('should not delete when cursor is at end with Delete key', () => {
      const { lastFrame, stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'hello',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\x1B[3~'); // Delete key at end

      // Should still contain full text
      expect(lastFrame()).toContain('hello');
    });
  });

  describe('cursor navigation', () => {
    it('should move cursor left with left arrow', () => {
      const { lastFrame, stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'hello',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\x1B[D'); // left arrow
      stdin.write('\x7F'); // backspace

      // Should delete the 'o', leaving 'hell'
      expect(lastFrame()).toContain('hell');
    });

    it('should move cursor to start with Ctrl+A', () => {
      const { lastFrame, stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'hello',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\x01'); // Ctrl+A
      stdin.write('\x1B[3~'); // Delete key

      // Should delete first character
      expect(lastFrame()).toContain('ello');
    });

    it('should move cursor to end with Ctrl+E', () => {
      const { lastFrame, stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'hello',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\x01'); // Ctrl+A (go to start)
      stdin.write('\x05'); // Ctrl+E (go to end)
      stdin.write('\x7F'); // backspace

      // Should delete last character
      expect(lastFrame()).toContain('hell');
    });
  });

  describe('submit behavior', () => {
    it('should call onSubmit with empty string when no input', () => {
      const { stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\r'); // Enter

      expect(mockOnSubmit).toHaveBeenCalledWith('');
    });

    it('should call onSubmit with default value when Enter pressed and no changes made', () => {
      const { stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'default.txt',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\r'); // Enter

      expect(mockOnSubmit).toHaveBeenCalledWith('default.txt');
    });

    it('should call onSubmit with default value when all text deleted', () => {
      const { stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'default.txt',
          onSubmit: mockOnSubmit,
        })
      );

      // Delete all text
      stdin.write('\x7F\x7F\x7F\x7F\x7F\x7F\x7F\x7F\x7F\x7F\x7F\x7F');
      stdin.write('\r'); // Enter

      expect(mockOnSubmit).toHaveBeenCalledWith('default.txt');
    });
  });

  describe('escape and cancel behavior', () => {
    it('should call onSubmit with default value when Escape is pressed', () => {
      const { stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'default.txt',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\x1B'); // Escape

      expect(mockOnSubmit).toHaveBeenCalledWith('default.txt');
    });

    it('should call onSubmit with default value when Ctrl+C is pressed', () => {
      const { stdin } = render(
        React.createElement(TextInput, {
          prompt: 'Enter:',
          defaultValue: 'default.txt',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\x03'); // Ctrl+C

      expect(mockOnSubmit).toHaveBeenCalledWith('default.txt');
    });
  });
});
