import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Menu, X, ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOC_SECTIONS, DocSection } from './docs/sections';
import { ALL_CONTENT, searchDocs } from './docs/content';
import ReactMarkdown from 'react-markdown';

export default function Docs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['introduction']));

  const activeSection = searchParams.get('section') || 'what-is-panoptes';

  const searchResults = useMemo(() => searchDocs(searchQuery), [searchQuery]);

  const currentContent = ALL_CONTENT[activeSection];

  const navigateToSection = (id: string) => {
    setSearchParams({ section: id });
    setMobileMenuOpen(false);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    DOC_SECTIONS.forEach(section => {
      if (section.subsections?.some(sub => sub.id === activeSection)) {
        setExpandedSections(prev => new Set(prev).add(section.id));
      }
    });
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100">
      <Header 
        onBack={() => navigate('/dashboard')} 
        onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
      />

      <div className="pt-16 flex">
        <Sidebar
          sections={DOC_SECTIONS}
          activeSection={activeSection}
          expandedSections={expandedSections}
          searchQuery={searchQuery}
          searchResults={searchResults}
          onSearchChange={setSearchQuery}
          onNavigate={navigateToSection}
          onToggleSection={toggleSection}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <main className="flex-1 lg:ml-72 min-h-[calc(100vh-4rem)]">
          <div className="max-w-4xl mx-auto px-6 py-12">
            {currentContent ? (
              <article className="prose prose-zinc dark:prose-invert max-w-none">
                <h1 className="text-3xl font-bold font-mono mb-8">{currentContent.title}</h1>
                <MarkdownContent content={currentContent.content} />
              </article>
            ) : (
              <div className="text-center py-20 text-zinc-500">
                <p>Section not found</p>
                <button 
                  onClick={() => navigateToSection('what-is-panoptes')}
                  className="mt-4 text-emerald-500 underline"
                >
                  Go to Introduction
                </button>
              </div>
            )}

            <Navigation 
              sections={DOC_SECTIONS} 
              activeSection={activeSection} 
              onNavigate={navigateToSection} 
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function Header({ onBack, onMenuToggle, mobileMenuOpen }: { 
  onBack: () => void; 
  onMenuToggle: () => void;
  mobileMenuOpen: boolean;
}) {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md z-50 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
          <ArrowLeft className="w-5 h-5 text-zinc-500" />
        </button>
        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800" />
        <span className="font-mono font-bold text-sm">Panoptes Documentation</span>
      </div>
      <div className="flex items-center gap-3">
        <a 
          href="https://github.com/We-Are-Triji/panoptes" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          GitHub <ExternalLink className="w-3 h-3" />
        </a>
        <button onClick={onMenuToggle} className="lg:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}

function Sidebar({ 
  sections, activeSection, expandedSections, searchQuery, searchResults,
  onSearchChange, onNavigate, onToggleSection, mobileOpen, onCloseMobile 
}: {
  sections: DocSection[];
  activeSection: string;
  expandedSections: Set<string>;
  searchQuery: string;
  searchResults: { id: string; title: string; excerpt: string }[];
  onSearchChange: (q: string) => void;
  onNavigate: (id: string) => void;
  onToggleSection: (id: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const sidebarContent = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg max-h-64 overflow-y-auto">
            {searchResults.map(result => (
              <button
                key={result.id}
                onClick={() => onNavigate(result.id)}
                className="w-full text-left px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <div className="text-sm font-medium">{result.title}</div>
                <div className="text-xs text-zinc-500 truncate">{result.excerpt}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {sections.map(section => (
          <div key={section.id}>
            <button
              onClick={() => onToggleSection(section.id)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            >
              <span className="flex items-center gap-2">
                <section.icon className="w-4 h-4" />
                {section.label}
              </span>
              {section.subsections && (
                expandedSections.has(section.id) 
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {section.subsections && expandedSections.has(section.id) && (
              <div className="ml-6 mt-1 space-y-1">
                {section.subsections.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => onNavigate(sub.id)}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors",
                      activeSection === sub.id
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-72 fixed left-0 top-16 bottom-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-16 bottom-0 w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => <h2 className="text-xl font-bold font-mono mt-8 mb-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-bold mt-6 mb-3">{children}</h3>,
        h4: ({ children }) => <h4 className="font-bold mt-4 mb-2">{children}</h4>,
        p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-zinc-700 dark:text-zinc-300">{children}</li>,
        code: ({ className, children }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-md overflow-x-auto mb-4 text-sm">
                <code>{children}</code>
              </pre>
            );
          }
          return <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
        },
        pre: ({ children }) => <>{children}</>,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm border border-zinc-200 dark:border-zinc-800">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 text-left font-mono text-xs uppercase border-b border-zinc-200 dark:border-zinc-800">{children}</th>,
        td: ({ children }) => <td className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800">{children}</td>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">
            {children}
          </a>
        ),
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-emerald-500 pl-4 italic text-zinc-600 dark:text-zinc-400 my-4">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function Navigation({ sections, activeSection, onNavigate }: {
  sections: DocSection[];
  activeSection: string;
  onNavigate: (id: string) => void;
}) {
  const allSubsections = sections.flatMap(s => s.subsections || []);
  const currentIndex = allSubsections.findIndex(s => s.id === activeSection);
  const prev = currentIndex > 0 ? allSubsections[currentIndex - 1] : null;
  const next = currentIndex < allSubsections.length - 1 ? allSubsections[currentIndex + 1] : null;

  return (
    <div className="flex justify-between items-center mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
      {prev ? (
        <button onClick={() => onNavigate(prev.id)} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          <ArrowLeft className="w-4 h-4" />
          {prev.label}
        </button>
      ) : <div />}
      {next && (
        <button onClick={() => onNavigate(next.id)} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          {next.label}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
