import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { logger } from '../lib/logger';
import { toast } from 'react-hot-toast';

interface MarkdownRendererProps {
  content?: string;
  className?: string;
}

export default function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  if (!content || content.trim() === '') {
    return <p className={className}>Aucune information définie</p>;
  }

  try {
    return (
      <div className={className || 'prose max-w-none'}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    logger.error('Erreur de rendu Markdown', { error });
    toast.error("Erreur lors de l'affichage du contenu.");
    return <p className={className}>Erreur lors de l'affichage du contenu.</p>;
  }
}
