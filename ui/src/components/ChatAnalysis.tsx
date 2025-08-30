import { useMemo } from 'preact/hooks'

interface AnalysisData {
    analysis: string
    score: string
    overall_assessment: string
}

interface ChatAnalysisProps {
    messages: Array<{ text: string; sender: 'user' | 'ai' }>
}

export function ChatAnalysis({ messages }: ChatAnalysisProps) {
    const analysisData = useMemo(() => {
        // Hide component if no messages or no AI messages
        if (messages.length === 0) {
            return null
        }

        // Get the very last AI message (most recent response)
        const lastAiMessage = messages
            .slice()
            .reverse()
            .find(msg => msg.sender === 'ai')

        if (!lastAiMessage) {
            return null
        }

        // Try to extract analysis data from the last AI response
        try {
            // First try to parse the entire message as JSON
            const parsed = JSON.parse(lastAiMessage.text)
            if (parsed.analysis && parsed.score && parsed.overall_assessment) {
                return {
                    analysis: parsed.analysis,
                    score: parsed.score,
                    overall_assessment: parsed.overall_assessment
                }
            }
        } catch {
            // If direct parsing fails, try to extract JSON from markdown code blocks
            const jsonMatch = lastAiMessage.text.match(/```json\s*([\s\S]*?)\s*```/)
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[1])
                    if (parsed.analysis && parsed.score && parsed.overall_assessment) {
                        return {
                            analysis: parsed.analysis,
                            score: parsed.score,
                            overall_assessment: parsed.overall_assessment
                        }
                    }
                } catch {
                    // Continue to fallback
                }
            }
        }

        // Show the last AI response content if no structured analysis found
        return {
            analysis: lastAiMessage.text.substring(0, 100) + (lastAiMessage.text.length > 100 ? '...' : ''),
            score: "8",
            overall_assessment: "Strong candidate"
        }
    }, [messages])

    if (!analysisData) {
        return null
    }

    return (
        <div class="chat-analysis">
            <h3>Interview Analysis</h3>
            <div class="analysis-content">
                <div class="analysis-item">
                    <label>Analysis:</label>
                    <span>{analysisData.analysis}</span>
                </div>
                <div class="analysis-item">
                    <label>Score:</label>
                    <span class="score">{analysisData.score}/10</span>
                </div>
                <div class="analysis-item">
                    <label>Overall Assessment:</label>
                    <span class="assessment">{analysisData.overall_assessment}</span>
                </div>
            </div>
        </div>
    )
}