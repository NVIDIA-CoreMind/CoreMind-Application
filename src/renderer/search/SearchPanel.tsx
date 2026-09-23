import React, { useState } from 'react';
import { Search, FileCode, X, Loader2 } from 'lucide-react';
import { useFilesStore } from '../stores/filesStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useTabsStore } from '../stores/tabsStore';

export const SearchPanel: React.FC = () => {
  const { rootPath } = useWorkspaceStore();
  const { searchResults, isSearching, search, clearSearch } = useFilesStore();
  const { openFile } = useTabsStore();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath || !query.trim()) return;
    search(query.trim(), rootPath);
  };

  const handleResultClick = (filePath: string, fileName: string) => {
    if (!rootPath) return;
    openFile(filePath, fileName, rootPath);
  };

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
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Search
      </div>

      {/* Search Input Box */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
        <form onSubmit={handleSearch} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search files (Press Enter)..."
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
                onClick={() => {
                  setQuery('');
                  clearSearch();
                }}
                style={{ padding: '2px', color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              style={{ padding: '2px', color: 'var(--accent)' }}
            >
              {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            </button>
          </div>
        </form>
      </div>

      {/* Results List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
        {!rootPath ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
            Open a folder to search
          </div>
        ) : searchResults.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
            {query ? 'No matching results found' : 'Enter a query to search across project'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px 6px' }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </div>
            {searchResults.map((result, idx) => (
              <div
                key={`${result.filePath}-${result.line}-${idx}`}
                onClick={() => handleResultClick(result.filePath, result.fileName)}
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
