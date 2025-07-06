'use client'

import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { useSocket } from '@/hooks/useSocket'
import { useAuth } from '@/hooks/useAuth'
import { CodeCompletion } from './CodeCompletion'
import { FileExplorer } from './FileExplorer'

interface CodeChange {
  userId: string
  username: string
  position: number
  text: string
  timestamp: number
}

export function CodeEditor() {
  const [code, setCode] = useState('// Welcome to CollabSpace\n// Start coding with your team\n\nfunction helloWorld() {\n  console.log("Hello, World!");\n}')
  const [language, setLanguage] = useState('javascript')
  const [fileName, setFileName] = useState('main.js')
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [cursorPositions, setCursorPositions] = useState<Record<string, { line: number; column: number; username: string }>>({})
  const editorRef = useRef<any>(null)
  const { socket } = useSocket()
  const { user } = useAuth()

  useEffect(() => {
    if (socket && user) {
      // Join the coding room
      socket.emit('join-room', { roomId: 'main-editor', userId: user.id, username: user.username })

      // Listen for code changes from other users
      socket.on('code-change', (change: CodeChange) => {
        if (change.userId !== user.id) {
          // Apply remote changes
          applyRemoteChange(change)
        }
      })

      // Listen for cursor movements
      socket.on('cursor-move', (data: { userId: string; username: string; position: { line: number; column: number } }) => {
        if (data.userId !== user.id) {
          setCursorPositions(prev => ({
            ...prev,
            [data.userId]: { ...data.position, username: data.username }
          }))
        }
      })

      // Listen for user joins/leaves
      socket.on('user-joined', (data: { userId: string; username: string }) => {
        console.log(`${data.username} joined the session`)
      })

      socket.on('user-left', (data: { userId: string; username: string }) => {
        console.log(`${data.username} left the session`)
        setCursorPositions(prev => {
          const newPositions = { ...prev }
          delete newPositions[data.userId]
          return newPositions
        })
      })

      return () => {
        socket.off('code-change')
        socket.off('cursor-move')
        socket.off('user-joined')
        socket.off('user-left')
        socket.emit('leave-room', { roomId: 'main-editor', userId: user.id })
      }
    }
  }, [socket, user])

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
      
      // Emit change to other users
      if (socket && user) {
        socket.emit('code-change', {
          roomId: 'main-editor',
          userId: user.id,
          username: user.username,
          text: value,
          timestamp: Date.now()
        })
      }
    }
  }

  const handleCursorMove = (event: any) => {
    if (socket && user) {
      const position = event.position
      socket.emit('cursor-move', {
        roomId: 'main-editor',
        userId: user.id,
        username: user.username,
        position: {
          line: position.lineNumber,
          column: position.column
        }
      })
    }
  }

  const applyRemoteChange = (change: CodeChange) => {
    if (editorRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        // Apply the remote change
        const range = model.getFullModelRange()
        model.pushEditOperations(
          [],
          [{ range, text: change.text }],
          () => null
        )
      }
    }
  }

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
    
    // Set up cursor decorations for other users
    editor.onDidChangeCursorPosition((e: any) => {
      handleCursorMove(e)
    })
  }

  const getLanguageFromFileName = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'sql': 'sql'
    }
    return languageMap[ext || ''] || 'javascript'
  }

  const handleFileSelect = (file: { name: string; content: string }) => {
    setFileName(file.name)
    setLanguage(getLanguageFromFileName(file.name))
    setCode(file.content)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-secondary-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input-field w-40"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="php">PHP</option>
            <option value="ruby">Ruby</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="markdown">Markdown</option>
            <option value="sql">SQL</option>
          </select>
          
          <span className="text-sm text-secondary-600">
            {fileName}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
            className="btn-secondary text-sm"
          >
            AI Assistant
          </button>
          
          <button className="btn-primary text-sm">
            Run Code
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex">
        <FileExplorer onFileSelect={handleFileSelect} />
        
        <div className="flex-1 relative">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: { enabled: true },
              hover: { enabled: true },
              contextmenu: true,
              mouseWheelZoom: true,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderWhitespace: 'selection',
              renderControlCharacters: false,
              renderLineHighlight: 'all',
              folding: true,
              foldingStrategy: 'indentation',
              showFoldingControls: 'always',
              unfoldOnClickAfterEnd: false,
              links: true,
              colorDecorators: true,
              lightbulb: { enabled: true },
              codeActionsOnSave: {
                'source.fixAll': 'explicit',
                'source.organizeImports': 'explicit'
              }
            }}
          />
          
          {/* AI Code Completion Panel */}
          {isAIAssistantOpen && (
            <div className="absolute right-4 top-4 w-80 bg-white rounded-lg shadow-strong border border-secondary-200">
              <CodeCompletion code={code} language={language} />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-secondary-900 text-secondary-100 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span>Language: {language}</span>
          <span>Lines: {code.split('\n').length}</span>
          <span>Characters: {code.length}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {Object.entries(cursorPositions).map(([userId, position]) => (
            <div key={userId} className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span>{position.username}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 