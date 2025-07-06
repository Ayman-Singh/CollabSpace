'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, Plus, Trash2, Edit3 } from 'lucide-react'

interface FileNode {
  id: string
  name: string
  type: 'file' | 'folder'
  path: string
  content?: string
  children?: FileNode[]
  isExpanded?: boolean
}

interface FileExplorerProps {
  onFileSelect: (file: { name: string; content: string }) => void
}

export function FileExplorer({ onFileSelect }: FileExplorerProps) {
  const [files, setFiles] = useState<FileNode[]>([
    {
      id: '1',
      name: 'src',
      type: 'folder',
      path: '/src',
      isExpanded: true,
      children: [
        {
          id: '2',
          name: 'components',
          type: 'folder',
          path: '/src/components',
          isExpanded: false,
          children: [
            {
              id: '3',
              name: 'App.tsx',
              type: 'file',
              path: '/src/components/App.tsx',
              content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Hello World</h1>
    </div>
  );
}

export default App;`
            },
            {
              id: '4',
              name: 'Button.tsx',
              type: 'file',
              path: '/src/components/Button.tsx',
              content: `import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={\`btn-\${variant}\`}
    >
      {children}
    </button>
  );
}

export default Button;`
            }
          ]
        },
        {
          id: '5',
          name: 'utils',
          type: 'folder',
          path: '/src/utils',
          isExpanded: false,
          children: [
            {
              id: '6',
              name: 'helpers.ts',
              type: 'file',
              path: '/src/utils/helpers.ts',
              content: `export function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}`
            }
          ]
        },
        {
          id: '7',
          name: 'index.tsx',
          type: 'file',
          path: '/src/index.tsx',
          content: `import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);`
        }
      ]
    },
    {
      id: '8',
      name: 'package.json',
      type: 'file',
      path: '/package.json',
      content: `{
  "name": "collabspace-app",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^4.9.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}`
    },
    {
      id: '9',
      name: 'README.md',
      type: 'file',
      path: '/README.md',
      content: `# CollabSpace App

A real-time collaboration platform for developers.

## Features

- Real-time code editing
- AI-powered code completion
- Video calls
- Chat functionality
- File management

## Getting Started

1. Install dependencies
2. Run the development server
3. Start collaborating!

## Technologies

- React
- TypeScript
- Socket.io
- WebRTC`
    }
  ])

  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isCreatingFile, setIsCreatingFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')

  const toggleFolder = (nodeId: string) => {
    const updateNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded }
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children) }
        }
        return node
      })
    }
    setFiles(updateNode(files))
  }

  const findFileById = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findFileById(node.children, id)
        if (found) return found
      }
    }
    return null
  }

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file' && file.content) {
      setSelectedFile(file.id)
      onFileSelect({
        name: file.name,
        content: file.content
      })
    }
  }

  const createNewFile = () => {
    if (!newFileName.trim()) return

    const newFile: FileNode = {
      id: Date.now().toString(),
      name: newFileName,
      type: 'file',
      path: `/${newFileName}`,
      content: `// New file: ${newFileName}\n\n`
    }

    setFiles(prev => [...prev, newFile])
    setNewFileName('')
    setIsCreatingFile(false)
  }

  const deleteFile = (fileId: string) => {
    const removeNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.filter(node => {
        if (node.id === fileId) return false
        if (node.children) {
          node.children = removeNode(node.children)
        }
        return true
      })
    }
    setFiles(removeNode(files))
    if (selectedFile === fileId) {
      setSelectedFile(null)
    }
  }

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isSelected = selectedFile === node.id
    const isFolder = node.type === 'folder'
    const hasChildren = node.children && node.children.length > 0

    return (
      <div key={node.id}>
        <div
          className={`flex items-center px-2 py-1 hover:bg-secondary-100 cursor-pointer ${
            isSelected ? 'bg-primary-100 border-r-2 border-primary-500' : ''
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {isFolder && (
            <button
              onClick={() => toggleFolder(node.id)}
              className="mr-1 text-secondary-500 hover:text-secondary-700"
            >
              {node.isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          )}
          
          <div className="flex items-center flex-1" onClick={() => handleFileClick(node)}>
            {isFolder ? (
              <Folder size={16} className="mr-2 text-secondary-500" />
            ) : (
              <File size={16} className="mr-2 text-secondary-400" />
            )}
            <span className="text-sm text-secondary-900 truncate">{node.name}</span>
          </div>

          {!isFolder && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {/* Edit file */}}
                className="p-1 hover:bg-secondary-200 rounded"
              >
                <Edit3 size={12} className="text-secondary-500" />
              </button>
              <button
                onClick={() => deleteFile(node.id)}
                className="p-1 hover:bg-secondary-200 rounded"
              >
                <Trash2 size={12} className="text-secondary-500" />
              </button>
            </div>
          )}
        </div>

        {isFolder && node.isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-r border-secondary-200 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-secondary-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-secondary-900">Files</h3>
          <button
            onClick={() => setIsCreatingFile(true)}
            className="p-1 hover:bg-secondary-100 rounded"
          >
            <Plus size={16} className="text-secondary-500" />
          </button>
        </div>
      </div>

      {/* Create New File */}
      {isCreatingFile && (
        <div className="p-3 border-b border-secondary-200">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Enter file name..."
            className="input-field text-sm"
            onKeyPress={(e) => e.key === 'Enter' && createNewFile()}
            autoFocus
          />
          <div className="flex space-x-2 mt-2">
            <button
              onClick={createNewFile}
              className="btn-primary text-xs"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreatingFile(false)
                setNewFileName('')
              }}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto group">
        {files.map(node => renderNode(node))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-secondary-200 text-xs text-secondary-500">
        {selectedFile ? (
          <div>
            Selected: {findFileById(files, selectedFile)?.name}
          </div>
        ) : (
          <div>No file selected</div>
        )}
      </div>
    </div>
  )
} 