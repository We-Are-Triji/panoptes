import { introductionContent, architectureContent } from './content-intro';
import { demeterContent, gettingStartedContent } from './content-demeter';
import { subscriptionsContent, webhooksContent } from './content-subscriptions';
import { configurationContent, apiReferenceContent, troubleshootingContent } from './content-config';

export interface DocContent {
  title: string;
  content: string;
}

export const ALL_CONTENT: Record<string, DocContent> = {
  ...introductionContent,
  ...architectureContent,
  ...demeterContent,
  ...gettingStartedContent,
  ...subscriptionsContent,
  ...webhooksContent,
  ...configurationContent,
  ...apiReferenceContent,
  ...troubleshootingContent,
};

export function searchDocs(query: string): { id: string; title: string; excerpt: string }[] {
  if (!query.trim()) return [];
  
  const lowerQuery = query.toLowerCase();
  const results: { id: string; title: string; excerpt: string; score: number }[] = [];
  
  Object.entries(ALL_CONTENT).forEach(([id, { title, content }]) => {
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    let score = 0;
    if (lowerTitle.includes(lowerQuery)) score += 10;
    if (lowerContent.includes(lowerQuery)) score += 1;
    
    if (score > 0) {
      const index = lowerContent.indexOf(lowerQuery);
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + query.length + 100);
      const excerpt = (start > 0 ? '...' : '') + 
                      content.slice(start, end).replace(/\n/g, ' ').trim() + 
                      (end < content.length ? '...' : '');
      
      results.push({ id, title, excerpt, score });
    }
  });
  
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
