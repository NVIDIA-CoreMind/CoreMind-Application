import React, { useState } from 'react';
import { Search, FileCode, X, Loader2, SlidersHorizontal } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';
import { useEditorStore } from '../stores/editorStore';
import { projectService } from '../services/coremind/project';
import { ProjectSearchMatch } from '../services/coremind/types';
import { useFilesStore } from '../stores/filesStore';

export const SearchPanel: React.FC = () => {
  const { rootPath } = useWorkspaceStore();
  const { openFile } = useTabsStore();
  const { setCursorPosition } = useEditorStore();
  const { searchResults: localResults, isSearching: localSearching, search: localSearch, clearSearch: localClear } = useFilesStore();

  const [query, setQuery] = useState('');
  const [filePattern, setFilePattern] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [backendMatches, setBackendMatches] = useState<ProjectSearchMatch[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !query.trim()) return;

    setIsSearching(true);
    try {
      // 1. Try CoreMind Backend Hybrid Search (Text + Regex + AST Symbol)
      const res = await projectService.searchProject({
        path: rootPath,
        query: query.trim(),
        file_pattern: filePattern.trim() || undefined,
        is_regex: isRegex,
        max_results: 50,
      });

      if (res && Array.isArray(res.matches)) {
        setBackendMatches(res.matches);
        setIsSearching(false);
        return;
      }
    } catch {
      // Fallback to local filesStore search if backend is offline
    }

    // Fallback: local file search
    setBackendMatches(null);
    await localSearch(query.trim(), rootPath);
    setIsSearching(false);
  };

  const handleResultClick = async (filePath: string, line: number) => {
    if (!rootPath) return;
    const fileName = filePath.split(/[/\\]/).pop() || 'file';
    const fullPath = filePath.startsWith(rootPath) ? filePath : `${rootPath}/${filePath}`.replace(/\/+/g, '/');
    await openFile(fullPath, fileName, rootPath);
    setCursorPosition(line, 1);
  };

  const handleClear = () => {
    setQuery('');
    setBackendMatches(null);
    localClear();
  };

  const hasMatches = backendMatches !== null ? backendMatches.length > 0 : localResults.length > 0;
  const isLoading = isSearching || localSearching;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: '35px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        <span>Search</span>
        <button
          onClick={() => setShowFilters(!showFilters)}
          title="Search Filters & Options"
          style={{
            background: 'transparent',
            border: 'none',
            color: showFilters || isRegex || filePattern ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '10px',
          }}
        >
          <SlidersHorizontal size={12} />
          <span>Filters</span>
        </button>
      </div>

      {/* Search Input Box */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search code or symbols..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!rootPath}
            style={{
              width: '100%',
              paddingRight: '48px',
              height: '26px',
            }}
          />
          <div style={{ position: 'absolute', right: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
            {query && (
              <button
                type="button"
                onClick={handleClear}
                style={{ padding: '2px', color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              style={{ padding: '2px', color: 'var(--accent)' }}
            >
              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            </button>
          </div>
        </form>

        {/* Collapsible Filter Options */}
        {showFilters && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '8px',
              backgroundColor: 'var(--bg-panel)',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isRegex}
                  onChange={(e) => setIsRegex(e.target.checked)}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span>Regex</span>
              </label>
            </div>
            <div>
              <input
                type="text"
                placeholder="files to include (e.g. *.ts, src/*)"
                value={filePattern}
                onChange={(e) => setFilePattern(e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '11px',
                  height: '22px',
                  padding: '2px 6px',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        {!rootPath ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
            Open a folder to search
          </div>
        ) : !hasMatches ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
            {query ? 'No matching results found' : 'Enter a query to search across project'}
          </div>
        ) : backendMatches !== null ? (
          /* Backend Search Results */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{backendMatches.length} result{backendMatches.length !== 1 ? 's' : ''} found</span>
              <span style={{ color: 'var(--accent)', fontSize: '10px' }}>CoreMind Hybrid Search</span>
            </div>
            {backendMatches.map((result, idx) => {
              const filePath = result.file_path || result.file || '';
              const fileName = filePath.split(/[/\\]/).pop() || filePath;
              const line = result.line_number || result.line || 1;
              const preview = result.content || result.preview || '';

              return (
                <div
                  key={`${filePath}-${line}-${idx}`}
                  onClick={() => handleResultClick(filePath, line)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-panel)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileCode size={13} color="var(--accent)" />
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {fileName}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        :{line}
                      </span>
                    </div>
                    {result.match_type && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor:
                            result.match_type === 'symbol'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                          color: result.match_type === 'symbol' ? '#10B981' : '#60A5FA',
                          fontWeight: 500,
                        }}
                      >
                        {result.match_type}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingLeft: '19px',
                    }}
                  >
                    {preview}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback Local Search Results */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 6px' }}>
              {localResults.length} result{localResults.length !== 1 ? 's' : ''} found
            </div>
            {localResults.map((result, idx) => (
              <div
                key={`${result.filePath}-${result.line}-${idx}`}
                onClick={() => handleResultClick(result.filePath, result.line)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <FileCode size={13} color="var(--accent)" />
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {result.fileName}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    :{result.line}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    paddingLeft: '19px',
                  }}
                >
                  {result.preview}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
