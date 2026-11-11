import {
  Atom,
  BookOpen,
  Brain,
  Calculator,
  Compass,
  Cpu,
  GitBranch,
  Lightbulb,
} from 'lucide-react';

export function CategoryIcon({
  iconKey,
  className = 'w-5 h-5',
}: {
  iconKey?: string | null;
  className?: string;
}) {
  switch (iconKey) {
    case 'calculator':
      return <Calculator className={className} />;
    case 'atom':
      return <Atom className={className} />;
    case 'book-open':
      return <BookOpen className={className} />;
    case 'git-branch':
      return <GitBranch className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'brain':
      return <Brain className={className} />;
    case 'sparkles':
      return <Lightbulb className={className} />;
    case 'compass':
    default:
      return <Compass className={className} />;
  }
}
