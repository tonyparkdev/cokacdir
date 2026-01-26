/**
 * Markdown Renderer for Terminal
 * Based on aiexecode's markdown rendering approach
 * Adapted for cokacdir project (TypeScript + Ink)
 */

import React from 'react';
import { Text, Box } from 'ink';
import { defaultTheme, Theme } from '../themes/classic-blue.js';

// Theme colors for markdown rendering
const mdTheme = {
  text: {
    primary: defaultTheme.colors.text,
    secondary: defaultTheme.colors.textDim,
    link: defaultTheme.colors.info,
  },
  status: {
    warning: defaultTheme.colors.warning,
  },
};

// Marker lengths for inline formatting
const MARKER_LENGTHS = {
  BOLD: 2,
  ITALIC: 1,
  STRIKE: 2,
  CODE: 1,
  UNDERLINE_START: 3,
  UNDERLINE_END: 4,
};

// Spacing constants
const SPACING = {
  EMPTY_LINE: 1,
  CODE_PADDING: 1,
  LIST_PREFIX_PAD: 1,
  LIST_TEXT_GROW: 1,
};

/**
 * Calculate display width of text (considering multi-byte characters)
 */
function calculateTextWidth(content: string): number {
  // Remove markdown formatting to get actual display width
  const plainText = content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/<u>(.*?)<\/u>/g, '$1')
    .replace(/.*\[(.*?)\]\(.*\)/g, '$1');

  // Simple width calculation (could use string-width for better accuracy)
  let width = 0;
  for (const char of plainText) {
    const code = char.charCodeAt(0);
    // CJK characters are typically double-width
    if (code >= 0x1100 && (
      code <= 0x115f || // Hangul Jamo
      code === 0x2329 || code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf && code !== 0x303f) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe1f) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    )) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Process inline markdown formatting
 */
interface ProcessInlineTextProps {
  content: string;
}

const ProcessInlineTextInternal: React.FC<ProcessInlineTextProps> = ({ content }) => {
  // Quick check - if no markdown patterns, return plain text
  if (!/[*_~`<[https?:]/.test(content)) {
    return <Text color={mdTheme.text.primary}>{content}</Text>;
  }

  const elements: React.ReactNode[] = [];
  let currentPosition = 0;
  const patternRegex = /(\*\*.*?\*\*|\*.*?\*|_.*?_|~~.*?~~|\[.*?\]\(.*?\)|`+.+?`+|<u>.*?<\/u>|https?:\/\/\S+)/g;
  let matchResult;

  while ((matchResult = patternRegex.exec(content)) !== null) {
    // Add plain text before match
    if (matchResult.index > currentPosition) {
      elements.push(
        <Text key={`plain-${currentPosition}`}>
          {content.slice(currentPosition, matchResult.index)}
        </Text>
      );
    }

    const matchedText = matchResult[0];
    let formattedElement: React.ReactNode = null;
    const elementKey = `fmt-${matchResult.index}`;

    try {
      // Bold: **text**
      if (matchedText.startsWith('**') && matchedText.endsWith('**') && matchedText.length > MARKER_LENGTHS.BOLD * 2) {
        formattedElement = (
          <Text key={elementKey} bold>
            {matchedText.slice(MARKER_LENGTHS.BOLD, -MARKER_LENGTHS.BOLD)}
          </Text>
        );
      }
      // Italic: *text* or _text_
      else if (
        matchedText.length > MARKER_LENGTHS.ITALIC * 2 &&
        ((matchedText.startsWith('*') && matchedText.endsWith('*')) ||
          (matchedText.startsWith('_') && matchedText.endsWith('_')))
      ) {
        // Check context to avoid matching file paths like /path/to/file
        const prevChar = content.substring(matchResult.index - 1, matchResult.index);
        const nextChar = content.substring(patternRegex.lastIndex, patternRegex.lastIndex + 1);
        if (!/\w/.test(prevChar) && !/\w/.test(nextChar)) {
          formattedElement = (
            <Text key={elementKey} italic>
              {matchedText.slice(MARKER_LENGTHS.ITALIC, -MARKER_LENGTHS.ITALIC)}
            </Text>
          );
        }
      }
      // Strikethrough: ~~text~~
      else if (matchedText.startsWith('~~') && matchedText.endsWith('~~') && matchedText.length > MARKER_LENGTHS.STRIKE * 2) {
        formattedElement = (
          <Text key={elementKey} strikethrough>
            {matchedText.slice(MARKER_LENGTHS.STRIKE, -MARKER_LENGTHS.STRIKE)}
          </Text>
        );
      }
      // Inline code: `code`
      else if (matchedText.startsWith('`') && matchedText.endsWith('`') && matchedText.length > MARKER_LENGTHS.CODE) {
        const codePattern = matchedText.match(/^(`+)(.+?)\1$/s);
        if (codePattern && codePattern[2]) {
          formattedElement = (
            <Text key={elementKey} color={mdTheme.status.warning}>
              {codePattern[2]}
            </Text>
          );
        }
      }
      // Link: [label](url)
      else if (matchedText.startsWith('[') && matchedText.includes('](') && matchedText.endsWith(')')) {
        const linkPattern = matchedText.match(/\[(.*?)\]\((.*?)\)/);
        if (linkPattern) {
          formattedElement = (
            <Text key={elementKey}>
              {linkPattern[1]}
              <Text color={mdTheme.text.link}> ({linkPattern[2]})</Text>
            </Text>
          );
        }
      }
      // Underline: <u>text</u>
      else if (matchedText.startsWith('<u>') && matchedText.endsWith('</u>')) {
        formattedElement = (
          <Text key={elementKey} underline>
            {matchedText.slice(MARKER_LENGTHS.UNDERLINE_START, -MARKER_LENGTHS.UNDERLINE_END)}
          </Text>
        );
      }
      // URL: https://...
      else if (/^https?:\/\//.test(matchedText)) {
        formattedElement = (
          <Text key={elementKey} color={mdTheme.text.link}>
            {matchedText}
          </Text>
        );
      }
    } catch {
      // Parsing error - ignore
      formattedElement = null;
    }

    elements.push(formattedElement ?? <Text key={elementKey}>{matchedText}</Text>);
    currentPosition = patternRegex.lastIndex;
  }

  // Add remaining text
  if (currentPosition < content.length) {
    elements.push(
      <Text key={`plain-${currentPosition}`}>
        {content.slice(currentPosition)}
      </Text>
    );
  }

  return <>{elements.filter((el) => el !== null)}</>;
};

const ProcessInlineText = React.memo(ProcessInlineTextInternal);

/**
 * Code block component
 */
interface BuildCodeBlockProps {
  lines: string[];
  language: string | null;
  terminalWidth: number;
}

const BuildCodeBlockInternal: React.FC<BuildCodeBlockProps> = ({ lines, language, terminalWidth }) => {
  const codeContent = lines.join('\n');

  return (
    <Box paddingLeft={SPACING.CODE_PADDING} flexDirection="column">
      {language && (
        <Text color={mdTheme.text.secondary} dimColor>
          {language}
        </Text>
      )}
      <Text color={mdTheme.status.warning}>{codeContent}</Text>
    </Box>
  );
};

const BuildCodeBlock = React.memo(BuildCodeBlockInternal);

/**
 * List item component
 */
interface BuildListItemProps {
  itemText: string;
  listType: 'ul' | 'ol';
  marker: string;
  indentation: string;
}

const BuildListItemInternal: React.FC<BuildListItemProps> = ({ itemText, listType, marker, indentation = '' }) => {
  const displayPrefix = listType === 'ol' ? `${marker}. ` : `${marker} `;
  const indentAmount = indentation.length;

  return (
    <Box paddingLeft={indentAmount + SPACING.LIST_PREFIX_PAD} flexDirection="row">
      <Box width={displayPrefix.length}>
        <Text color={mdTheme.text.primary}>{displayPrefix}</Text>
      </Box>
      <Box flexGrow={SPACING.LIST_TEXT_GROW}>
        <Text wrap="wrap" color={mdTheme.text.primary}>
          <ProcessInlineText content={itemText} />
        </Text>
      </Box>
    </Box>
  );
};

const BuildListItem = React.memo(BuildListItemInternal);

/**
 * Table component
 */
interface BuildTableProps {
  columnHeaders: string[];
  dataRows: string[][];
  maxWidth: number;
}

const BuildTableInternal: React.FC<BuildTableProps> = ({ columnHeaders, dataRows, maxWidth }) => {
  // Calculate column widths
  const widthPerColumn = columnHeaders.map((headerText, columnIndex) => {
    const headerDisplayWidth = calculateTextWidth(headerText);
    const maxDataWidth = Math.max(
      0,
      ...dataRows.map((rowData) => calculateTextWidth(rowData[columnIndex] || ''))
    );
    return Math.max(headerDisplayWidth, maxDataWidth) + 2;
  });

  // Shrink if exceeds terminal width
  const totalRequiredWidth = widthPerColumn.reduce((sum, w) => sum + w + 1, 1);
  const shrinkRatio = totalRequiredWidth > maxWidth ? maxWidth / totalRequiredWidth : 1;
  const finalWidths = widthPerColumn.map((w) => Math.floor(w * shrinkRatio));

  // Build border line
  const buildBorderLine = (position: 'top' | 'mid' | 'bottom') => {
    const borderStyles = {
      top: { leftCorner: '┌', junction: '┬', rightCorner: '┐', line: '─' },
      mid: { leftCorner: '├', junction: '┼', rightCorner: '┤', line: '─' },
      bottom: { leftCorner: '└', junction: '┴', rightCorner: '┘', line: '─' },
    };

    const style = borderStyles[position];
    const segments = finalWidths.map((width) => style.line.repeat(width));
    const borderText = style.leftCorner + segments.join(style.junction) + style.rightCorner;

    return <Text color={mdTheme.text.secondary}>{borderText}</Text>;
  };

  // Build cell
  const buildCell = (cellText: string, cellWidth: number, isHeader = false) => {
    const availableWidth = Math.max(0, cellWidth - 2);
    const actualWidth = calculateTextWidth(cellText);
    let displayText = cellText;

    if (actualWidth > availableWidth) {
      displayText = cellText.substring(0, Math.max(0, availableWidth - 3)) + '...';
    }

    const paddingRequired = Math.max(0, availableWidth - calculateTextWidth(displayText));

    return (
      <Text>
        {isHeader ? (
          <Text bold color={mdTheme.text.link}>
            <ProcessInlineText content={displayText} />
          </Text>
        ) : (
          <ProcessInlineText content={displayText} />
        )}
        {' '.repeat(paddingRequired)}
      </Text>
    );
  };

  // Build table row
  const buildTableRow = (rowCells: string[], isHeader = false) => {
    return (
      <Text color={mdTheme.text.primary}>
        {'│ '}
        {rowCells.map((cell, idx) => (
          <React.Fragment key={idx}>
            {buildCell(cell || '', finalWidths[idx] || 0, isHeader)}
            {idx < rowCells.length - 1 ? ' │ ' : ''}
          </React.Fragment>
        ))}
        {' │'}
      </Text>
    );
  };

  return (
    <Box flexDirection="column" marginY={0}>
      {buildBorderLine('top')}
      {buildTableRow(columnHeaders, true)}
      {buildBorderLine('mid')}
      {dataRows.map((row, idx) => (
        <React.Fragment key={idx}>{buildTableRow(row)}</React.Fragment>
      ))}
      {buildBorderLine('bottom')}
    </Box>
  );
};

const BuildTable = React.memo(BuildTableInternal);

/**
 * Main markdown rendering function
 */
export interface RenderMarkdownOptions {
  terminalWidth?: number;
}

export function renderMarkdown(text: string, options: RenderMarkdownOptions = {}): React.ReactNode {
  if (!text) return null;

  const { terminalWidth = 80 } = options;

  const lineArray = text.split(/\r?\n/);

  // Regex patterns
  const patterns = {
    header: /^ *(#{1,4}) +(.*)/,
    codeFence: /^ *(`{3,}|~{3,}) *(\w*?) *$/,
    unorderedList: /^([ \t]*)([-*+]) +(.*)/,
    orderedList: /^([ \t]*)(\d+)\. +(.*)/,
    horizontalRule: /^ *([-*_] *){3,} *$/,
    tableRow: /^\s*\|(.+)\|\s*$/,
    tableSeparator: /^\s*\|?\s*(:?-+:?)\s*(\|\s*(:?-+:?)\s*)+\|?\s*$/,
  };

  const blocks: React.ReactNode[] = [];
  let previousLineWasEmpty = true;

  // State variables
  let codeBlockActive = false;
  let codeBlockLines: string[] = [];
  let codeBlockLanguage: string | null = null;
  let codeBlockFence = '';

  let tableActive = false;
  let tableHeaderCells: string[] = [];
  let tableDataRows: string[][] = [];

  function appendBlock(block: React.ReactNode) {
    if (block) {
      blocks.push(block);
      previousLineWasEmpty = false;
    }
  }

  lineArray.forEach((currentLine, lineIndex) => {
    const lineKey = `ln-${lineIndex}`;

    // Inside code block
    if (codeBlockActive) {
      const fenceMatch = currentLine.match(patterns.codeFence);
      if (
        fenceMatch &&
        fenceMatch[1].startsWith(codeBlockFence[0]) &&
        fenceMatch[1].length >= codeBlockFence.length
      ) {
        appendBlock(
          <BuildCodeBlock
            key={lineKey}
            lines={codeBlockLines}
            language={codeBlockLanguage}
            terminalWidth={terminalWidth}
          />
        );
        codeBlockActive = false;
        codeBlockLines = [];
        codeBlockLanguage = null;
        codeBlockFence = '';
      } else {
        codeBlockLines.push(currentLine);
      }
      return;
    }

    // Pattern matching
    const fenceMatch = currentLine.match(patterns.codeFence);
    const headerMatch = currentLine.match(patterns.header);
    const ulMatch = currentLine.match(patterns.unorderedList);
    const olMatch = currentLine.match(patterns.orderedList);
    const hrMatch = currentLine.match(patterns.horizontalRule);
    const tableRowMatch = currentLine.match(patterns.tableRow);
    const tableSepMatch = currentLine.match(patterns.tableSeparator);

    // Code block start
    if (fenceMatch) {
      codeBlockActive = true;
      codeBlockFence = fenceMatch[1];
      codeBlockLanguage = fenceMatch[2] || null;
    }
    // Table start detection
    else if (tableRowMatch && !tableActive) {
      if (lineIndex + 1 < lineArray.length && lineArray[lineIndex + 1].match(patterns.tableSeparator)) {
        tableActive = true;
        tableHeaderCells = tableRowMatch[1].split('|').map((cell) => cell.trim());
        tableDataRows = [];
      } else {
        appendBlock(
          <Box key={lineKey}>
            <Text wrap="wrap">
              <ProcessInlineText content={currentLine} />
            </Text>
          </Box>
        );
      }
    }
    // Table separator skip
    else if (tableActive && tableSepMatch) {
      // Skip separator line
    }
    // Table data row
    else if (tableActive && tableRowMatch) {
      const cells = tableRowMatch[1].split('|').map((cell) => cell.trim());
      while (cells.length < tableHeaderCells.length) cells.push('');
      if (cells.length > tableHeaderCells.length) cells.length = tableHeaderCells.length;
      tableDataRows.push(cells);
    }
    // Table end
    else if (tableActive && !tableRowMatch) {
      if (tableHeaderCells.length > 0 && tableDataRows.length > 0) {
        appendBlock(
          <BuildTable
            key={`table-${blocks.length}`}
            columnHeaders={tableHeaderCells}
            dataRows={tableDataRows}
            maxWidth={terminalWidth}
          />
        );
      }
      tableActive = false;
      tableDataRows = [];
      tableHeaderCells = [];

      // Process current line
      if (currentLine.trim().length > 0) {
        appendBlock(
          <Box key={lineKey}>
            <Text wrap="wrap">
              <ProcessInlineText content={currentLine} />
            </Text>
          </Box>
        );
      }
    }
    // Horizontal rule
    else if (hrMatch) {
      appendBlock(
        <Box key={lineKey}>
          <Text dimColor>{'─'.repeat(Math.min(40, terminalWidth - 4))}</Text>
        </Box>
      );
    }
    // Headers
    else if (headerMatch) {
      const level = headerMatch[1].length;
      const headerText = headerMatch[2];
      let headerElement: React.ReactNode = null;

      switch (level) {
        case 1:
        case 2:
          headerElement = (
            <Text bold color={mdTheme.text.link}>
              <ProcessInlineText content={headerText} />
            </Text>
          );
          break;
        case 3:
          headerElement = (
            <Text bold color={mdTheme.text.primary}>
              <ProcessInlineText content={headerText} />
            </Text>
          );
          break;
        case 4:
          headerElement = (
            <Text italic color={mdTheme.text.secondary}>
              <ProcessInlineText content={headerText} />
            </Text>
          );
          break;
        default:
          headerElement = (
            <Text color={mdTheme.text.primary}>
              <ProcessInlineText content={headerText} />
            </Text>
          );
      }
      if (headerElement) {
        appendBlock(<Box key={lineKey}>{headerElement}</Box>);
      }
    }
    // Unordered list
    else if (ulMatch) {
      const [, indent, marker, content] = ulMatch;
      appendBlock(
        <BuildListItem key={lineKey} itemText={content} listType="ul" marker={marker} indentation={indent} />
      );
    }
    // Ordered list
    else if (olMatch) {
      const [, indent, marker, content] = olMatch;
      appendBlock(
        <BuildListItem key={lineKey} itemText={content} listType="ol" marker={marker} indentation={indent} />
      );
    }
    // Empty line or plain text
    else {
      if (currentLine.trim().length === 0 && !codeBlockActive) {
        if (!previousLineWasEmpty) {
          blocks.push(<Box key={`space-${lineIndex}`} height={SPACING.EMPTY_LINE} />);
          previousLineWasEmpty = true;
        }
      } else {
        appendBlock(
          <Box key={lineKey}>
            <Text wrap="wrap" color={mdTheme.text.primary}>
              <ProcessInlineText content={currentLine} />
            </Text>
          </Box>
        );
      }
    }
  });

  // Handle unclosed code block
  if (codeBlockActive) {
    appendBlock(
      <BuildCodeBlock
        key="eof-code"
        lines={codeBlockLines}
        language={codeBlockLanguage}
        terminalWidth={terminalWidth}
      />
    );
  }

  // Handle unclosed table
  if (tableActive && tableHeaderCells.length > 0 && tableDataRows.length > 0) {
    appendBlock(
      <BuildTable
        key={`table-${blocks.length}`}
        columnHeaders={tableHeaderCells}
        dataRows={tableDataRows}
        maxWidth={terminalWidth}
      />
    );
  }

  return <>{blocks}</>;
}

/**
 * Markdown text component for easy use
 */
interface MarkdownTextProps {
  children: string;
  width?: number;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ children, width = 80 }) => {
  return <>{renderMarkdown(children, { terminalWidth: width })}</>;
};
