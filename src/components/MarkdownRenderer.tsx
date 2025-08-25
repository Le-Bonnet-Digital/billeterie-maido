import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

interface MarkdownRendererProps {
  content?: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content || content.trim() === '') {
    return <p className={className}>Aucun contenu à afficher.</p>;
  }

  try {
    return (
      <div className={className}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
          {content}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.error('Erreur de rendu Markdown:', error);
    return <p className={className}>Erreur lors de l\'affichage du contenu.</p>;
  }
}

