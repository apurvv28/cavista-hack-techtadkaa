import { useState, useEffect, useCallback, useRef } from "react";

interface TranscriptionEntry {
    speaker: string;
    text: string;
    timestamp: string;
}

export function useTranscription(role: "Doctor" | "Patient", onEntry?: (entry: TranscriptionEntry) => void) {
    const [transcript, setTranscript] = useState<TranscriptionEntry[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const isRecordingRef = useRef(false);
    const recognitionRef = useRef<any>(null);

    // Stable ref for the callback
    const onEntryRef = useRef(onEntry);
    useEffect(() => {
        onEntryRef.current = onEntry;
    }, [onEntry]);

    const startTranscription = useCallback(() => {
        if (isRecordingRef.current) return;

        if (!("webkitSpeechRecognition" in window) && !("speechRecognition" in window)) {
            console.error("Speech recognition not supported in this browser.");
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const resultText = event.results[i][0].transcript;
                    const entry: TranscriptionEntry = {
                        speaker: role,
                        text: resultText,
                        timestamp: new Date().toLocaleTimeString(),
                    };
                    setTranscript((prev) => [...prev, entry]);
                    onEntryRef.current?.(entry);
                }
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === "aborted") {
                console.log("Speech recognition aborted (expected if stopping or transitioning)");
                return;
            }
            console.error("Speech recognition error", event.error);
        };

        recognition.onend = () => {
            if (isRecordingRef.current) {
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Failed to restart recognition", e);
                }
            }
        };

        recognitionRef.current = recognition;
        try {
            recognition.start();
            setIsRecording(true);
            isRecordingRef.current = true;
        } catch (e) {
            console.error("Failed to start recognition", e);
        }
    }, [role]);

    const stopTranscription = useCallback(() => {
        isRecordingRef.current = false;
        setIsRecording(false);
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // Ignore errors on stop
            }
        }
    }, []);

    const exportTranscript = useCallback(() => {
        const text = transcript
            .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
            .join("\n");

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `consultation_transcript_${new Date().toISOString()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }, [transcript]);

    return {
        transcript,
        isRecording,
        startTranscription,
        stopTranscription,
        exportTranscript,
        setTranscript,
    };
}
