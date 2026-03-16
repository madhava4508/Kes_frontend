import { useState } from "react";
import { Input } from "../../components/Input";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Search as SearchIcon, FileText, TrendingUp, Clock } from "lucide-react";
import { mockSearchResults, recentSearches, popularTopics } from "../../../data/mockData";
import type { SearchResult } from "../../../data/mockData";

export function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setHasSearched(true);
    // Simulate search with mock results
    setResults(mockSearchResults);
  };

  const getRelevanceLabel = (relevance: number) => {
    if (relevance >= 90) return "text-foreground";
    if (relevance >= 75) return "text-foreground/80";
    return "text-muted-foreground";
  };

  return (
    <div className="p-10 max-w-6xl mx-auto">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Semantic Search</h1>
        <p className="text-muted-foreground">Search across all your encrypted documents using AI</p>
      </div>

      {/* Search Input */}
      <Card className="mb-10 animate-fade-in stagger-1">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              icon={<SearchIcon className="w-5 h-5" />}
              placeholder="Search your documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              className="text-lg"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-[24px] hover:opacity-90 transition-all duration-200 disabled:opacity-50 font-semibold"
            disabled={!searchQuery.trim()}
          >
            Search
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Our AI searches through encrypted content using semantic understanding
        </p>
      </Card>

      {!hasSearched && (
        <>
          {/* Recent Searches */}
          <div className="mb-10 animate-fade-in stagger-2">
            <h2 className="text-lg font-semibold mb-4">Recent Searches</h2>
            <div className="flex flex-wrap gap-3">
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSearchQuery(search);
                    setHasSearched(true);
                    setResults(mockSearchResults);
                  }}
                  className="px-4 py-2 bg-card border border-border rounded-full hover:border-white/15 transition-all duration-200 text-sm flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  {search}
                </button>
              ))}
            </div>
          </div>

          {/* Popular Topics */}
          <div className="animate-fade-in stagger-3">
            <h2 className="text-lg font-semibold mb-4">Popular Topics</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {popularTopics.map((item, i) => {
                const Icon = i === 0 ? TrendingUp : FileText;
                return (
                  <Card key={i} hover className="cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white/5 rounded-[12px]">
                        <Icon className="w-6 h-6 text-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.topic}</p>
                        <p className="text-sm text-muted-foreground">{item.count} documents</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}

      {hasSearched && results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <p className="text-muted-foreground">
              Found <span className="text-foreground font-semibold">{results.length} results</span> for "{searchQuery}"
            </p>
            <button
              onClick={() => {
                setHasSearched(false);
                setResults([]);
                setSearchQuery("");
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Clear Search
            </button>
          </div>

          <div className="space-y-4">
            {results.map((result, index) => (
              <Card key={result.id} hover className={`cursor-pointer animate-fade-in-up stagger-${Math.min(index + 1, 8)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-[8px]">
                      <FileText className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{result.fileName}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{result.fileType}</span>
                        <span>·</span>
                        <span>Modified {result.lastModified}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="primary" className="flex items-center gap-1">
                    <span className={getRelevanceLabel(result.relevance)}>{result.relevance}%</span>
                    <span className="text-muted-foreground">match</span>
                  </Badge>
                </div>
                
                <p className="text-muted-foreground leading-relaxed">
                  {result.snippet}
                </p>
                
                <div className="flex gap-3 mt-4">
                  <button className="text-sm text-foreground hover:opacity-70 transition-colors duration-200">Open Document</button>
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Ask AI About This</button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {hasSearched && results.length === 0 && (
        <div className="text-center py-20 animate-fade-in">
          <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground mb-2">No results found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search query</p>
        </div>
      )}
    </div>
  );
}
