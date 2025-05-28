// src/utils/tiptapToMarkdown.ts (create this new file)

import { type JSONContent } from '@tiptap/core';

// Helper to escape Markdown special characters in text
function escapeMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}

function jsonNodeToMarkdown(node: JSONContent, listLevel = 0): string {
  let markdown = '';

  switch (node.type) {
    case 'doc':
      if (node.content) {
        markdown += node.content.map(n => jsonNodeToMarkdown(n)).join('\n\n');
      }
      break;

    // Your custom header node
    case 'unmodifiableHeader':
      if (node.attrs && node.attrs.label) {
        const level = node.attrs.level || 1; // Default to h1 if level not present
        markdown += `${'#'.repeat(level)} ${escapeMarkdown(String(node.attrs.label))}`;
      }
      break;

    case 'paragraph':
      if (node.content) {
        markdown += node.content.map(n => jsonNodeToMarkdown(n)).join('');
      } else {
        markdown += '\n'; // Handle empty paragraphs as a newline if desired
      }
      break;

    case 'text':
      let text = escapeMarkdown(node.text || '');
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === 'bold') {
            text = `**${text}**`;
          } else if (mark.type === 'italic') {
            text = `*${text}*`;
          } else if (mark.type === 'strike') {
            text = `~~${text}~~`;
          } else if (mark.type === 'code') {
            text = `\`${text}\``;
          }
          // Add other marks like underline, link if needed
        }
      }
      markdown += text;
      break;

    case 'heading': // Standard Tiptap heading
      if (node.attrs && node.attrs.level && node.content) {
        const level = node.attrs.level;
        const content = node.content.map(n => jsonNodeToMarkdown(n)).join('');
        markdown += `${'#'.repeat(level)} ${content}`;
      }
      break;

    case 'bulletList':
      if (node.content) {
        const indent = '  '.repeat(listLevel);
        markdown += node.content.map(itemNode => `${indent}* ${jsonNodeToMarkdown(itemNode, listLevel + 1)}`).join('\n');
      }
      break;

    case 'orderedList':
      if (node.content) {
        const indent = '  '.repeat(listLevel);
        let start = (node.attrs && node.attrs.start) || 1;
        markdown += node.content.map((itemNode, index) => `${indent}${start + index}. ${jsonNodeToMarkdown(itemNode, listLevel + 1)}`).join('\n');
      }
      break;

    case 'listItem': // Content of listItem is typically a paragraph or other blocks
      if (node.content) {
        markdown += node.content.map(n => jsonNodeToMarkdown(n, listLevel)).join('\n').trimEnd(); // Trim trailing newlines from inner content
      }
      break;

    case 'blockquote':
      if (node.content) {
        const content = node.content.map(n => jsonNodeToMarkdown(n)).join('\n').split('\n').map(line => `> ${line}`).join('\n');
        markdown += content;
      }
      break;

    case 'hardBreak':
      markdown += '  \n'; // Markdown for hard break (two spaces then newline)
      break;

    case 'horizontalRule':
      markdown += '\n---\n';
      break;

    case 'codeBlock':
      if (node.content && node.content[0] && node.content[0].text) {
        const lang = (node.attrs && node.attrs.language) || '';
        markdown += `\`\`\`${lang}\n${node.content[0].text}\n\`\`\``;
      } else {
        markdown += `\`\`\`\n\n\`\`\``;
      }
      break;

    // Add cases for other Tiptap nodes you use (e.g., image, table, link)
    case 'link': // This mark is usually handled within the 'text' node, but if it's a node:
        if (node.attrs && node.attrs.href && node.content) {
            const text = node.content.map(n => jsonNodeToMarkdown(n)).join('');
            markdown += `[${text}](${escapeMarkdown(node.attrs.href)})`;
        }
        break;

    default:
      // For unknown nodes, try to process their content if they have any
      if (node.content && Array.isArray(node.content)) {
        markdown += node.content.map(n => jsonNodeToMarkdown(n, listLevel)).join('');
      } else if (node.text) { // Fallback for simple text nodes not explicitly handled
        markdown += escapeMarkdown(node.text);
      }
      // console.warn('Unsupported Tiptap node type for Markdown conversion:', node.type);
      break;
  }
  return markdown;
}


export function tiptapJsonToMarkdown(doc: JSONContent): string {
  if (doc.type !== 'doc' || !doc.content) {
    return '';
  }
  // Process each top-level node and join with double newlines for block separation
  return doc.content.map(node => jsonNodeToMarkdown(node).trim()).filter(md => md.length > 0).join('\n\n');
}