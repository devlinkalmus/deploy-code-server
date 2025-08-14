/**
 * File Explorer Component
 * File management and preview for JRVI IDE
 * Phase 14 implementation
 */

import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logging';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  lastModified: Date;
  children?: FileNode[];
  content?: string;
  metadata?: {
    traceId?: string;
    brand?: string;
    persona?: string;
    generated?: boolean;
  };
}

interface FileExplorerProps {
  currentBrand: string;
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (path: string, content: string) => void;
  onFileDelete: (path: string) => void;
  generatedFiles: any[];
}

export default function FileExplorer({
  currentBrand,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  generatedFiles
}: FileExplorerProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeFileTree();
  }, [generatedFiles]);

  const initializeFileTree = () => {
    setLoading(true);
    
    // Create initial file structure
    const initialTree: FileNode[] = [
      {
        id: 'src',
        name: 'src',
        type: 'directory',
        path: '/src',
        lastModified: new Date(),
        children: [
          {
            id: 'components',
            name: 'components',
            type: 'directory',
            path: '/src/components',
            lastModified: new Date(),
            children: []
          },
          {
            id: 'utils',
            name: 'utils',
            type: 'directory',
            path: '/src/utils',
            lastModified: new Date(),
            children: []
          },
          {
            id: 'types',
            name: 'types',
            type: 'directory',
            path: '/src/types',
            lastModified: new Date(),
            children: []
          }
        ]
      },
      {
        id: 'generated',
        name: 'generated',
        type: 'directory',
        path: '/generated',
        lastModified: new Date(),
        children: []
      },
      {
        id: 'docs',
        name: 'docs',
        type: 'directory',
        path: '/docs',
        lastModified: new Date(),
        children: []
      }
    ];

    // Add generated files
    const updatedTree = [...initialTree];
    const generatedDir = updatedTree.find(node => node.id === 'generated');
    
    if (generatedDir && generatedFiles.length > 0) {
      generatedDir.children = generatedFiles.map(artifact => ({
        id: artifact.id,
        name: artifact.fileName,
        type: 'file' as const,
        path: `/generated/${artifact.fileName}`,
        size: artifact.content.length,
        lastModified: artifact.metadata.generatedAt,
        content: artifact.content,
        metadata: {
          traceId: artifact.metadata.traceId,
          brand: artifact.metadata.brand,
          persona: artifact.metadata.persona,
          generated: true
        }
      }));
    }

    setFileTree(updatedTree);
    setLoading(false);
    
    logger.info('File tree initialized', 'file-explorer', {
      totalNodes: countNodes(updatedTree),
      generatedFiles: generatedFiles.length,
      brand: currentBrand
    });
  };

  const countNodes = (nodes: FileNode[]): number => {
    return nodes.reduce((count, node) => {
      return count + 1 + (node.children ? countNodes(node.children) : 0);
    }, 0);
  };

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'directory') {
      toggleExpanded(file.id);
    } else {
      setSelectedFile(file);
      onFileSelect(file);
      
      logger.audit('File selected in explorer', 'file-explorer', {
        fileName: file.name,
        path: file.path,
        brand: currentBrand,
        generated: file.metadata?.generated || false
      }, {
        tags: ['file-selection', 'ide'],
        brandAffinity: [currentBrand]
      });
    }
  };

  const getFileIcon = (file: FileNode): string => {
    if (file.type === 'directory') {
      return expandedNodes.has(file.id) ? '📂' : '📁';
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'ts': case 'tsx': return '⚡';
      case 'js': case 'jsx': return '📜';
      case 'json': return '📋';
      case 'md': return '📝';
      case 'yaml': case 'yml': return '⚙️';
      case 'config': return '🔧';
      case 'css': return '🎨';
      case 'html': return '🌐';
      default: return '📄';
    }
  };

  const getFileSize = (size?: number): string => {
    if (!size) return '';
    if (size < 1024) return `${size}B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
    return `${Math.round(size / (1024 * 1024))}MB`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filterFiles = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    
    return nodes.filter(node => {
      const matches = node.name.toLowerCase().includes(query.toLowerCase());
      const childMatches = node.children ? filterFiles(node.children, query).length > 0 : false;
      return matches || childMatches;
    }).map(node => ({
      ...node,
      children: node.children ? filterFiles(node.children, query) : undefined
    }));
  };

  const renderFileNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedFile?.id === node.id;
    const indent = depth * 20;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${8 + indent}px` }}
          onClick={() => handleFileClick(node)}
        >
          <span className="mr-2 text-sm">{getFileIcon(node)}</span>
          <span className="flex-1 text-sm truncate">{node.name}</span>
          
          {node.metadata?.generated && (
            <span className="text-xs bg-green-100 text-green-600 px-1 rounded mr-2">
              GEN
            </span>
          )}
          
          {node.size && (
            <span className="text-xs text-gray-500 mr-2">
              {getFileSize(node.size)}
            </span>
          )}
          
          {node.type === 'directory' && node.children && (
            <span className="text-xs text-gray-400">
              {node.children.length} items
            </span>
          )}
        </div>

        {node.type === 'directory' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = searchQuery ? filterFiles(fileTree, searchQuery) : fileTree;

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Explorer</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowHidden(!showHidden)}
              title={showHidden ? 'Hide hidden files' : 'Show hidden files'}
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
            >
              {showHidden ? '👁️' : '🚫'}
            </button>
            <button
              onClick={initializeFileTree}
              title="Refresh"
              className="p-1 text-gray-500 hover:text-gray-700 rounded"
            >
              🔄
            </button>
          </div>
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500 mx-auto mb-2"></div>
            Loading files...
          </div>
        ) : filteredTree.length > 0 ? (
          <div className="py-2">
            {filteredTree.map(node => renderFileNode(node))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No files match your search' : 'No files found'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500">
          <div className="flex justify-between">
            <span>{countNodes(fileTree)} items</span>
            <span>Brand: {currentBrand}</span>
          </div>
          {selectedFile && (
            <div className="mt-1 pt-1 border-t border-gray-300">
              <div className="font-medium">{selectedFile.name}</div>
              <div className="flex justify-between">
                <span>{getFileSize(selectedFile.size)}</span>
                <span>{formatDate(selectedFile.lastModified)}</span>
              </div>
              {selectedFile.metadata?.traceId && (
                <div className="text-xs text-blue-600">
                  Trace: {selectedFile.metadata.traceId.slice(0, 12)}...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}