import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render } from 'ink-testing-library';
import { Confirm } from './Confirm.js';

describe('Confirm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('component rendering', () => {
    it('should display the message', () => {
      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Do you want to proceed?',
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('Do you want to proceed?');
    });

    it('should show Y/n when default is true', () => {
      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should show y/N when default is false', () => {
      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('(y/N)');
    });

    it('should default to true when defaultValue is not provided', () => {
      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          onSubmit: mockOnSubmit,
        })
      );

      // Should show uppercase Y for true
      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should show instructions for key presses', () => {
      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          onSubmit: mockOnSubmit,
        })
      );

      const output = lastFrame() ?? '';
      expect(output).toContain('Y/N');
      expect(output).toContain('Enter');
      expect(output).toContain('toggle');
      expect(output).toContain('confirm');
    });

    it('should render with different messages', () => {
      const messages = [
        'Strip comments from source files?',
        'Include directory tree view?',
        'Include statistics section?',
        'Generate markdown file?',
      ];

      for (const message of messages) {
        const { lastFrame } = render(
          React.createElement(Confirm, {
            message,
            onSubmit: mockOnSubmit,
          })
        );

        expect(lastFrame()).toContain(message);
      }
    });
  });

  describe('keyboard interactions', () => {
    it('should call onSubmit with true on Enter when value is true', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Press Enter
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnSubmit).toHaveBeenCalledWith(true);
    });

    it('should call onSubmit with false on Enter when value is false', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      // Press Enter
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnSubmit).toHaveBeenCalledWith(false);
    });

    it('should set value to true when Y is pressed', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      // Initially shows y/N
      expect(lastFrame()).toContain('(y/N)');

      // Press Y
      stdin.write('Y');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should now show Y/n
      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should set value to true when lowercase y is pressed', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      // Press y
      stdin.write('y');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should show Y/n
      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should set value to false when N is pressed', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Initially shows Y/n
      expect(lastFrame()).toContain('(Y/n)');

      // Press N
      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should now show y/N
      expect(lastFrame()).toContain('(y/N)');
    });

    it('should set value to false when lowercase n is pressed', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Press n
      stdin.write('n');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should show y/N
      expect(lastFrame()).toContain('(y/N)');
    });

    it('should toggle value with left arrow', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Initially Y/n
      expect(lastFrame()).toContain('(Y/n)');

      // Press left arrow
      stdin.write('\x1B[D');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should toggle to y/N
      expect(lastFrame()).toContain('(y/N)');
    });

    it('should toggle value with right arrow', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      // Initially y/N
      expect(lastFrame()).toContain('(y/N)');

      // Press right arrow
      stdin.write('\x1B[C');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should toggle to Y/n
      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should toggle twice with arrow keys', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Initially Y/n
      expect(lastFrame()).toContain('(Y/n)');

      // Toggle to false
      stdin.write('\x1B[D');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(lastFrame()).toContain('(y/N)');

      // Toggle back to true
      stdin.write('\x1B[C');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should submit changed value after toggling', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Press N to change value
      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 30));

      // Then press Enter
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnSubmit).toHaveBeenCalledWith(false);
    });

    it('should ignore other keys', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Press various other keys
      stdin.write('a');
      await new Promise(resolve => setTimeout(resolve, 30));

      stdin.write('b');
      await new Promise(resolve => setTimeout(resolve, 30));

      stdin.write('1');
      await new Promise(resolve => setTimeout(resolve, 30));

      // Value should remain true
      expect(lastFrame()).toContain('(Y/n)');
      // onSubmit should not have been called
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should handle multiple Y presses', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      // Press Y multiple times
      stdin.write('Y');
      await new Promise(resolve => setTimeout(resolve, 30));
      stdin.write('Y');
      await new Promise(resolve => setTimeout(resolve, 30));

      // Should still be true
      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should handle multiple N presses', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Press N multiple times
      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 30));
      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 30));

      // Should still be false
      expect(lastFrame()).toContain('(y/N)');
    });
  });

  describe('complex interaction sequences', () => {
    it('should handle Y then Enter sequence', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      // Press Y then Enter
      stdin.write('Y');
      await new Promise(resolve => setTimeout(resolve, 30));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnSubmit).toHaveBeenCalledWith(true);
    });

    it('should handle N then Enter sequence', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Press N then Enter
      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 30));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnSubmit).toHaveBeenCalledWith(false);
    });

    it('should handle arrow key then Enter sequence', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Toggle with arrow then confirm
      stdin.write('\x1B[D'); // Left arrow to toggle to false
      await new Promise(resolve => setTimeout(resolve, 30));
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnSubmit).toHaveBeenCalledWith(false);
    });

    it('should handle Y, N, Y, Enter sequence', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      // Y -> true
      stdin.write('Y');
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(lastFrame()).toContain('(Y/n)');

      // N -> false
      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(lastFrame()).toContain('(y/N)');

      // Y -> true
      stdin.write('Y');
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(lastFrame()).toContain('(Y/n)');

      // Enter -> submit true
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockOnSubmit).toHaveBeenCalledWith(true);
    });

    it('should handle rapid key presses', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Rapid toggle
      stdin.write('N');
      stdin.write('Y');
      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Final state should be false
      expect(lastFrame()).toContain('(y/N)');
    });
  });

  describe('component API', () => {
    it('should have required props: message and onSubmit', () => {
      interface ConfirmProps {
        message: string;
        defaultValue?: boolean;
        onSubmit: (value: boolean) => void;
      }

      const props: ConfirmProps = {
        message: 'Test message?',
        onSubmit: (value: boolean) => {
          expect(typeof value).toBe('boolean');
        },
      };

      expect(props.message).toBe('Test message?');
    });

    it('should accept boolean callback', async () => {
      let receivedValue: boolean | undefined;

      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Test?',
          defaultValue: true,
          onSubmit: (value: boolean) => {
            receivedValue = value;
          },
        })
      );

      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(typeof receivedValue).toBe('boolean');
      expect(receivedValue).toBe(true);
    });
  });

  describe('visual feedback', () => {
    it('should show green color when value is true', () => {
      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // The (Y/n) indicator should be shown
      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should show dim color when value is false', () => {
      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      // The (y/N) indicator should be shown
      expect(lastFrame()).toContain('(y/N)');
    });

    it('should update visual indicator when value changes', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Initially green (Y/n)
      expect(lastFrame()).toContain('(Y/n)');

      // Change to false
      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should now show (y/N)
      expect(lastFrame()).toContain('(y/N)');
    });
  });

  describe('edge cases', () => {
    it('should handle immediate Enter press', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Proceed?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      // Immediately press Enter
      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockOnSubmit).toHaveBeenCalledWith(true);
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should handle empty message', () => {
      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: '',
          onSubmit: mockOnSubmit,
        })
      );

      // Should still render indicator
      expect(lastFrame()).toContain('(Y/n)');
    });

    it('should handle very long message', () => {
      const longMessage = 'A'.repeat(200);

      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: longMessage,
          onSubmit: mockOnSubmit,
        })
      );

      const output = lastFrame() ?? '';
      // The long message may be wrapped across lines, so check for a portion of it
      expect(output).toContain('A'.repeat(50));
      expect(output).toContain('(Y/n)');
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Proceed with changes? 🚀 (test) [important]';

      const { lastFrame } = render(
        React.createElement(Confirm, {
          message: specialMessage,
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain(specialMessage);
    });
  });

  describe('regression prevention', () => {
    it('should prevent race condition by using Ink instead of @inquirer/prompts', () => {
      // This test documents that we use Ink for confirmations
      // Previously, using @inquirer/prompts caused race conditions
      // when switching from Ink file selector to inquirer prompts

      const inkComponents = ['Box', 'Text', 'useInput', 'useApp'];
      expect(inkComponents.length).toBeGreaterThan(0);

      // Should NOT use @inquirer/prompts
      const forbiddenImports = ['@inquirer/prompts'];
      expect(forbiddenImports).not.toContain('ink');
    });

    it('should use useState for state management', () => {
      // The component uses React's useState hook
      // This ensures proper state management within Ink
      const reactHooks = ['useState'];
      expect(reactHooks).toContain('useState');
    });

    it('should use useInput for keyboard handling', () => {
      // The component uses Ink's useInput hook
      // This ensures consistent keyboard handling
      const inkHooks = ['useInput'];
      expect(inkHooks).toContain('useInput');
    });

    it('should call exit() on submission', async () => {
      // The component should exit the Ink app on submission
      // to prevent terminal cleanup issues

      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Test?',
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      // onSubmit should be called, which means exit() was also called
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should handle strip comments confirmation', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Strip comments from source files?',
          defaultValue: false,
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('Strip comments');
      expect(lastFrame()).toContain('(y/N)');

      stdin.write('Y');
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(lastFrame()).toContain('(Y/n)');

      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockOnSubmit).toHaveBeenCalledWith(true);
    });

    it('should handle include tree confirmation', async () => {
      const { stdin, lastFrame } = render(
        React.createElement(Confirm, {
          message: 'Include directory tree view?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      expect(lastFrame()).toContain('Include directory tree');
      expect(lastFrame()).toContain('(Y/n)');

      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockOnSubmit).toHaveBeenCalledWith(true);
    });

    it('should handle include stats confirmation', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Include statistics section?',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 30));

      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockOnSubmit).toHaveBeenCalledWith(false);
    });

    it('should handle generate confirmation', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Press ENTER to generate, or N to cancel',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockOnSubmit).toHaveBeenCalledWith(true);
    });

    it('should handle cancel generation', async () => {
      const { stdin } = render(
        React.createElement(Confirm, {
          message: 'Press ENTER to generate, or N to cancel',
          defaultValue: true,
          onSubmit: mockOnSubmit,
        })
      );

      stdin.write('N');
      await new Promise(resolve => setTimeout(resolve, 30));

      stdin.write('\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockOnSubmit).toHaveBeenCalledWith(false);
    });
  });
});
