'use client'

import { useState, useEffect } from 'react'

interface CodeCompletionProps {
  code: string
  language: string
}

interface CompletionSuggestion {
  id: string
  text: string
  description: string
  type: 'function' | 'variable' | 'import' | 'snippet'
  confidence: number
}

export function CodeCompletion({ code, language }: CodeCompletionProps) {
  const [suggestions, setSuggestions] = useState<CompletionSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<CompletionSuggestion | null>(null)
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    if (code.length > 10) {
      generateSuggestions()
    }
  }, [code, language])

  const generateSuggestions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/ai/code-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          context: 'Provide intelligent code completion suggestions'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error generating suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionSelect = (suggestion: CompletionSuggestion) => {
    setSelectedSuggestion(suggestion)
    // Emit event to parent component to insert the suggestion
    window.dispatchEvent(new CustomEvent('insert-suggestion', {
      detail: { suggestion }
    }))
  }

  const handleCustomPrompt = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          context: {
            code,
            language,
            type: 'code_completion'
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Handle the AI response
        console.log('AI Response:', data)
      }
    } catch (error) {
      console.error('Error with custom prompt:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-secondary-200">
        <h3 className="font-semibold text-secondary-900 mb-2">AI Code Assistant</h3>
        <p className="text-sm text-secondary-600">
          Get intelligent code suggestions and completions
        </p>
      </div>

      {/* Custom Prompt */}
      <div className="p-4 border-b border-secondary-200">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask AI for code help..."
          className="input-field h-20 resize-none"
        />
        <button
          onClick={handleCustomPrompt}
          disabled={isLoading || !prompt.trim()}
          className="btn-primary w-full mt-2 text-sm"
        >
          {isLoading ? 'Processing...' : 'Ask AI'}
        </button>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="loading-spinner mx-auto mb-2"></div>
            <p className="text-sm text-secondary-600">Generating suggestions...</p>
          </div>
        ) : (
          <div className="p-4">
            <h4 className="font-medium text-secondary-900 mb-3">Suggestions</h4>
            {suggestions.length === 0 ? (
              <p className="text-sm text-secondary-500">
                Start typing to get AI-powered suggestions
              </p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="p-3 rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50 cursor-pointer transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-secondary-900">
                        {suggestion.text}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        suggestion.type === 'function' ? 'bg-blue-100 text-blue-700' :
                        suggestion.type === 'variable' ? 'bg-green-100 text-green-700' :
                        suggestion.type === 'import' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {suggestion.type}
                      </span>
                    </div>
                    <p className="text-xs text-secondary-600">
                      {suggestion.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-secondary-500">
                        Confidence: {Math.round(suggestion.confidence * 100)}%
                      </span>
                      <button className="text-xs text-primary-600 hover:text-primary-700">
                        Insert
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Suggestion Details */}
      {selectedSuggestion && (
        <div className="p-4 border-t border-secondary-200 bg-secondary-50">
          <h4 className="font-medium text-secondary-900 mb-2">Selected Suggestion</h4>
          <div className="bg-white p-3 rounded border border-secondary-200">
            <code className="text-sm text-secondary-800 block mb-2">
              {selectedSuggestion.text}
            </code>
            <p className="text-xs text-secondary-600">
              {selectedSuggestion.description}
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 border-t border-secondary-200">
        <h4 className="font-medium text-secondary-900 mb-2">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPrompt('Optimize this code for performance')}
            className="btn-secondary text-xs"
          >
            Optimize
          </button>
          <button
            onClick={() => setPrompt('Add error handling to this code')}
            className="btn-secondary text-xs"
          >
            Add Error Handling
          </button>
          <button
            onClick={() => setPrompt('Add TypeScript types to this code')}
            className="btn-secondary text-xs"
          >
            Add Types
          </button>
          <button
            onClick={() => setPrompt('Write unit tests for this code')}
            className="btn-secondary text-xs"
          >
            Write Tests
          </button>
        </div>
      </div>
    </div>
  )
} 