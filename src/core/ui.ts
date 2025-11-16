/**
 * Modern CLI UI utilities with sleek, next-gen design
 * No emojis - clean, professional terminal aesthetics
 */
import chalk from 'chalk';

// Color palette - modern, muted, professional
const colors = {
  primary: chalk.hex('#FBBF24'),      // Yellow (brand color)
  secondary: chalk.hex('#06B6D4'),    // Cyan
  accent: chalk.hex('#F59E0B'),       // Amber
  success: chalk.hex('#10B981'),      // Green
  error: chalk.hex('#EF4444'),        // Red
  warning: chalk.hex('#F97316'),      // Orange
  muted: chalk.hex('#6B7280'),        // Gray
  dim: chalk.hex('#9CA3AF'),          // Light gray
  highlight: chalk.hex('#FBBF24'),    // Yellow
  info: chalk.hex('#3B82F6'),         // Blue
};

// Unicode box-drawing characters
const box = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  verticalRight: '├',
  verticalLeft: '┤',
  horizontalDown: '┬',
  horizontalUp: '┴',
  cross: '┼',
};

// Modern symbols (no emojis)
const symbols = {
  check: '✓',
  cross: '✗',
  bullet: '•',
  arrow: '→',
  arrowRight: '›',
  dot: '·',
  bar: '│',
  dash: '─',
  ellipsis: '…',
  star: '★',
  diamond: '◆',
  circle: '○',
  filledCircle: '●',
  square: '■',
  triangle: '▲',
  info: 'ℹ',
  warning: '⚠',
  pointer: '▸',
  line: '━',
};

/**
 * Create a horizontal line
 */
export function line(width: number = 60): string {
  return colors.muted(symbols.line.repeat(width));
}

/**
 * Create a thin separator line
 */
export function separator(width: number = 60): string {
  return colors.dim(symbols.dash.repeat(width));
}

/**
 * Modern banner with ASCII art logo
 */
export function banner(): string {
  const logo = [
    '╭─────────────────────────────────────────────────────────╮',
    '│                                                         │',
    '│   ██████╗ ███████╗██████╗  ██████╗                      │',
    '│   ██╔══██╗██╔════╝██╔══██╗██╔═══██╗                     │',
    '│   ██████╔╝█████╗  ██████╔╝██║   ██║                     │',
    '│   ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║                     │',
    '│   ██║  ██║███████╗██║     ╚██████╔╝                     │',
    '│   ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝                      │',
    '│                                                         │',
    '│   ██████╗  ██████╗ ██╗     ██╗     ███████╗██████╗      │',
    '│   ██╔══██╗██╔═══██╗██║     ██║     ██╔════╝██╔══██╗     │',
    '│   ██████╔╝██║   ██║██║     ██║     █████╗  ██████╔╝     │',
    '│   ██╔══██╗██║   ██║██║     ██║     ██╔══╝  ██╔══██╗     │',
    '│   ██║  ██║╚██████╔╝███████╗███████╗███████╗██║  ██║     │',
    '│   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝     │',
    '│                                                         │',
    '╰─────────────────────────────────────────────────────────╯',
  ];

  const lines: string[] = [];

  lines.push('');
  lines.push(colors.muted(logo[0]));
  lines.push(colors.muted(logo[1]));
  for (let i = 2; i <= 7; i++) {
    lines.push(colors.primary(logo[i]));
  }
  lines.push(colors.muted(logo[8]));
  for (let i = 9; i <= 14; i++) {
    lines.push(colors.secondary(logo[i]));
  }
  lines.push(colors.muted(logo[15]));
  lines.push(colors.muted(logo[16]));
  lines.push('');
  lines.push(center(colors.dim('Source Code Aggregator') + '  ' + colors.muted('v1.0.0')));
  lines.push('');

  return lines.join('\n');
}

/**
 * Compact header for minimal output
 */
export function header(): string {
  const title = colors.primary.bold('repo-roller');
  const version = colors.dim('v1.0.0');

  return [
    '',
    `${title} ${version}`,
    colors.muted(symbols.line.repeat(60)),
    '',
  ].join('\n');
}

/**
 * Ultra-minimal inline header
 */
export function headerInline(): string {
  return colors.primary.bold('repo-roller') + colors.dim(' ') + colors.muted('›');
}

/**
 * Status indicator with icon
 */
export function status(type: 'scan' | 'render' | 'write' | 'analyze', message: string): string {
  const icons: Record<string, string> = {
    scan: colors.secondary(symbols.pointer),
    render: colors.accent(symbols.pointer),
    write: colors.success(symbols.pointer),
    analyze: colors.info(symbols.pointer),
  };

  return `${icons[type]} ${colors.dim(message)}`;
}

/**
 * Success message
 */
export function success(message: string): string {
  return `${colors.success(symbols.check)} ${message}`;
}

/**
 * Error message
 */
export function error(message: string): string {
  return `${colors.error(symbols.cross)} ${message}`;
}

/**
 * Warning message
 */
export function warning(message: string): string {
  return `${colors.warning(symbols.warning)} ${message}`;
}

/**
 * Info message
 */
export function info(message: string): string {
  return `${colors.info(symbols.info)} ${message}`;
}

/**
 * Bullet point
 */
export function bullet(message: string, indent: number = 2): string {
  const spaces = ' '.repeat(indent);
  return `${spaces}${colors.dim(symbols.bullet)} ${message}`;
}

/**
 * Create a boxed section
 */
export function boxSection(title: string, content: string[], width: number = 60): string {
  const lines: string[] = [];
  const innerWidth = width - 2;

  // Top border with title
  const titleLength = title.length + 2;
  const leftPad = Math.floor((innerWidth - titleLength) / 2);
  const rightPad = innerWidth - titleLength - leftPad;

  lines.push(
    colors.muted(box.topLeft) +
    colors.muted(box.horizontal.repeat(leftPad)) +
    ' ' + colors.accent.bold(title) + ' ' +
    colors.muted(box.horizontal.repeat(rightPad)) +
    colors.muted(box.topRight)
  );

  // Content
  for (const line of content) {
    const stripped = stripAnsi(line);
    const padding = innerWidth - stripped.length;
    lines.push(
      colors.muted(box.vertical) +
      line +
      ' '.repeat(Math.max(0, padding)) +
      colors.muted(box.vertical)
    );
  }

  // Bottom border
  lines.push(
    colors.muted(box.bottomLeft) +
    colors.muted(box.horizontal.repeat(innerWidth)) +
    colors.muted(box.bottomRight)
  );

  return lines.join('\n');
}

/**
 * Create a simple section with title
 */
export function section(title: string): string {
  return `\n${colors.primary.bold(title)}\n${colors.muted(symbols.line.repeat(title.length + 4))}\n`;
}

/**
 * Format a key-value pair
 */
export function keyValue(key: string, value: string | number, keyWidth: number = 20): string {
  const formattedKey = colors.dim(key.padEnd(keyWidth));
  return `  ${formattedKey} ${value}`;
}

/**
 * Format a metric with optional status
 */
export function metric(
  label: string,
  value: string,
  status?: 'good' | 'warning' | 'bad'
): string {
  let statusIcon = '';
  if (status === 'good') {
    statusIcon = colors.success(symbols.check);
  } else if (status === 'warning') {
    statusIcon = colors.warning(symbols.warning);
  } else if (status === 'bad') {
    statusIcon = colors.error(symbols.cross);
  }

  return `  ${statusIcon} ${label}: ${colors.primary(value)}`;
}

/**
 * Progress indicator (simple, no spinner)
 */
export function progress(current: number, total: number, label: string = ''): string {
  const percentage = Math.round((current / total) * 100);
  const barWidth = 30;
  const filled = Math.round((current / total) * barWidth);
  const empty = barWidth - filled;

  const bar = colors.primary('█'.repeat(filled)) + colors.dim('░'.repeat(empty));
  const pct = colors.dim(`${percentage}%`);

  return `  ${bar} ${pct} ${colors.dim(label)}`;
}

/**
 * Create a table row for provider costs
 */
export function providerRow(
  name: string,
  cost: string,
  withinLimit: boolean,
  highlight: boolean = false
): string {
  const statusIcon = withinLimit
    ? colors.success(symbols.check)
    : colors.error(symbols.cross);

  const nameText = highlight
    ? colors.highlight.bold(name)
    : name;

  const costText = highlight
    ? colors.highlight.bold(cost)
    : colors.dim(cost);

  return `  ${statusIcon} ${nameText.padEnd(25)} ${costText}`;
}

/**
 * Create a provider row with context utilization bar
 */
export function providerRowWithBar(
  name: string,
  cost: string,
  utilizationPercent: number,
  withinLimit: boolean,
  highlight: boolean = false
): string {
  const statusIcon = withinLimit
    ? colors.success(symbols.check)
    : colors.error(symbols.cross);

  const nameText = highlight
    ? colors.highlight.bold(name.padEnd(20))
    : name.padEnd(20);

  const costText = highlight
    ? colors.highlight.bold(cost.padEnd(12))
    : colors.dim(cost.padEnd(12));

  // Create utilization bar
  const barWidth = 15;
  const filled = Math.min(Math.round((utilizationPercent / 100) * barWidth), barWidth);
  const empty = barWidth - filled;

  let barColor = colors.success;
  if (utilizationPercent > 80) {
    barColor = colors.error;
  } else if (utilizationPercent > 50) {
    barColor = colors.warning;
  }

  const bar = barColor('█'.repeat(filled)) + colors.dim('░'.repeat(empty));
  const pct = colors.dim(`${utilizationPercent.toFixed(0)}%`.padStart(4));

  return `  ${statusIcon} ${nameText} ${costText} ${bar} ${pct}`;
}

/**
 * Format file size with color coding
 */
export function fileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const formatted = `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;

  // Color based on size
  if (bytes > 10 * 1024 * 1024) {
    return colors.error(formatted);
  } else if (bytes > 1024 * 1024) {
    return colors.warning(formatted);
  } else {
    return colors.muted(formatted);
  }
}

/**
 * Format token count with magnitude
 */
export function tokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return colors.error(`${(tokens / 1_000_000).toFixed(2)}M`);
  } else if (tokens >= 100_000) {
    return colors.warning(`${(tokens / 1_000).toFixed(0)}K`);
  } else if (tokens >= 10_000) {
    return colors.accent(`${(tokens / 1_000).toFixed(1)}K`);
  } else {
    return colors.success(tokens.toLocaleString());
  }
}

/**
 * Strip ANSI codes from string (for calculating width)
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Center text
 */
export function center(text: string, width: number = 60): string {
  const stripped = stripAnsi(text);
  const padding = Math.max(0, Math.floor((width - stripped.length) / 2));
  return ' '.repeat(padding) + text;
}

/**
 * Right-align text
 */
export function rightAlign(text: string, width: number = 60): string {
  const stripped = stripAnsi(text);
  const padding = Math.max(0, width - stripped.length);
  return ' '.repeat(padding) + text;
}

/**
 * Create a gradient text effect (simulated with color steps)
 */
export function gradientText(text: string): string {
  const gradientColors = [
    chalk.hex('#FBBF24'),
    chalk.hex('#F59E0B'),
    chalk.hex('#D97706'),
    chalk.hex('#B45309'),
  ];

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const colorIndex = Math.min(
      Math.floor((i / text.length) * gradientColors.length),
      gradientColors.length - 1
    );
    // Safe access - index is always within bounds due to Math.min
    const colorFn = gradientColors[colorIndex]!;
    result += colorFn(text[i]);
  }
  return result;
}

// Export the color palette for custom use
export { colors, symbols, box };
