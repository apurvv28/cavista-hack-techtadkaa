import { useState, useRef, useCallback } from "react";

export function useAudioRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

    const startRecording = useCallback(async (localStream: MediaStream) => {
        try {
            // Create AudioContext and explicitly RESUME it (required due to browser autoplay policy)
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            // Resume the audio context — browsers suspend it without a user gesture
            if (ctx.state === "suspended") {
                await ctx.resume();
                console.log("AudioContext resumed from suspended state");
            }

            const dest = ctx.createMediaStreamDestination();
            destinationRef.current = dest;

            // Add local audio (doctor or patient mic)
            const localAudioTracks = localStream.getAudioTracks();
            if (localAudioTracks.length > 0) {
                const localSource = ctx.createMediaStreamSource(localStream);
                localSource.connect(dest);
                console.log("Local audio track connected to recorder:", localAudioTracks[0].label);
            } else {
                console.warn("No local audio tracks found in stream");
            }

            // Use a MIME type that is widely supported
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "";

            const mediaRecorder = mimeType
                ? new MediaRecorder(dest.stream, { mimeType })
                : new MediaRecorder(dest.stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                    console.log(`Audio chunk captured: ${event.data.size} bytes (total chunks: ${audioChunksRef.current.length})`);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event);
            };

            // Use a 1-second timeslice so data accumulates continuously
            // Without this, ondataavailable only fires on stop() — if stop() fails, we lose everything
            mediaRecorder.start(1000);
            setIsRecording(true);
            console.log("Audio recording started. MIME type:", mediaRecorder.mimeType);
        } catch (err) {
            console.error("Failed to start audio recording:", err);
        }
    }, []);

    const addRemoteStream = useCallback((remoteStream: MediaStream) => {
        if (!audioContextRef.current || !destinationRef.current) {
            console.warn("Cannot add remote stream — AudioContext not initialized yet");
            return;
        }

        const remoteAudioTracks = remoteStream.getAudioTracks();
        if (remoteAudioTracks.length === 0) {
            console.warn("No audio tracks found in remote stream");
            return;
        }

        try {
            const remoteSource = audioContextRef.current.createMediaStreamSource(remoteStream);
            remoteSource.connect(destinationRef.current);
            console.log("Remote audio stream mixed into recording:", remoteAudioTracks[0].label);
        } catch (e) {
            console.error("Error adding remote stream to recording:", e);
        }
    }, []);

    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const recorder = mediaRecorderRef.current;

            if (!recorder || recorder.state === "inactive") {
                console.warn("stopRecording called but MediaRecorder is not active. State:", recorder?.state ?? "null");
                resolve(null);
                return;
            }

            console.log(`Stopping MediaRecorder. State: ${recorder.state}. Chunks so far: ${audioChunksRef.current.length}`);

            recorder.onstop = () => {
                const chunks = audioChunksRef.current;
                console.log(`Recording stopped. Total chunks: ${chunks.length}`);

                if (chunks.length === 0) {
                    console.error("No audio chunks captured! The recording was empty.");
                    resolve(null);
                    return;
                }

                const mimeType = recorder.mimeType || "audio/webm";
                const audioBlob = new Blob(chunks, { type: mimeType });
                console.log(`Audio blob created: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

                setIsRecording(false);

                if (audioContextRef.current) {
                    audioContextRef.current.close().catch(console.error);
                }

                resolve(audioBlob);
            };

            recorder.stop();
        });
    }, []);

    return {
        isAudioRecording: isRecording,
        startAudioRecording: startRecording,
        addRemoteStreamToRecording: addRemoteStream,
        stopAudioRecording: stopRecording,
    };
}
