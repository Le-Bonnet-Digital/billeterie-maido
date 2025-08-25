import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

// Very small markdown parser to keep compatibility
function parseMarkdown(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // italic
    .replace(/`([^`]+)`/g, '<code>$1</code>') // inline code
    .replace(/\n\n/g, '</p><p>') // new paragraphs
    .replace(/\n/g, '<br />'); // line breaks
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = React.useMemo(() => parseMarkdown(content), [content]);

  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}
