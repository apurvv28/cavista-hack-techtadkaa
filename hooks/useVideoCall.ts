import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const ICE_CONFIG = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function useVideoCall(
    appointmentId: Id<"appointments">,
    userId: Id<"users">,
    onMessage?: (data: any) => void
) {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>("disconnected");

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const processedSignals = useRef<Set<Id<"signaling">>>(new Set());
    const candidateQueue = useRef<RTCIceCandidateInit[]>([]);

    // Stable ref for the callback
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const signals = useQuery(api.consultations.getSignals, { appointmentId });
    const sendSignalMutation = useMutation(api.consultations.sendSignal);
    const clearSignalsMutation = useMutation(api.consultations.clearSignals);

    const setupMedia = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error("Failed to get local stream", err);
            return null;
        }
    }, []);

    const setupDataChannel = useCallback((channel: RTCDataChannel) => {
        channel.onopen = () => console.log("Data channel opened");
        channel.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onMessageRef.current?.(data);
            } catch (e) {
                console.error("Failed to parse message", e);
            }
        };
        dcRef.current = channel;
    }, []);

    const createPeerConnection = useCallback((stream: MediaStream) => {
        if (pcRef.current) return pcRef.current;

        const pc = new RTCPeerConnection(ICE_CONFIG);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                setRemoteStream(event.streams[0]);
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignalMutation({
                    appointmentId,
                    senderId: userId,
                    type: "candidate",
                    payload: JSON.stringify(event.candidate),
                });
            }
        };

        pc.ondatachannel = (event) => {
            setupDataChannel(event.channel);
        };

        pc.onconnectionstatechange = () => {
            setConnectionStatus(pc.connectionState);
        };

        pcRef.current = pc;
        return pc;
    }, [appointmentId, userId, sendSignalMutation, setupDataChannel]);

    // Handle incoming signals
    useEffect(() => {
        if (!signals || !pcRef.current) return;

        const processSignals = async () => {
            const pc = pcRef.current;
            if (!pc) return;

            for (const signal of signals) {
                if (signal.senderId === userId || processedSignals.current.has(signal._id)) continue;

                const payload = JSON.parse(signal.payload);

                try {
                    if (signal.type === "offer" && pc.signalingState === "stable") {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        await sendSignalMutation({
                            appointmentId,
                            senderId: userId,
                            type: "answer",
                            payload: JSON.stringify(answer),
                        });
                        processedSignals.current.add(signal._id);
                    } else if (signal.type === "answer" && pc.signalingState === "have-local-offer") {
                        await pc.setRemoteDescription(new RTCSessionDescription(payload));
                        processedSignals.current.add(signal._id);
                    } else if (signal.type === "candidate") {
                        if (pc.remoteDescription) {
                            await pc.addIceCandidate(new RTCIceCandidate(payload));
                            processedSignals.current.add(signal._id);
                        } else {
                            candidateQueue.current.push(payload);
                        }
                    }
                } catch (e) {
                    console.error("Error processing signal:", signal.type, e);
                }
            }
        };

        processSignals();
    }, [signals, userId, appointmentId, sendSignalMutation]);

    const startCall = useCallback(async () => {
        const stream = await setupMedia();
        if (!stream) return;

        const pc = createPeerConnection(stream);
        const dc = pc.createDataChannel("transcription");
        setupDataChannel(dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await sendSignalMutation({
            appointmentId,
            senderId: userId,
            type: "offer",
            payload: JSON.stringify(offer),
        });
    }, [setupMedia, createPeerConnection, appointmentId, userId, sendSignalMutation, setupDataChannel]);

    const joinCall = useCallback(async () => {
        const stream = await setupMedia();
        if (!stream) return;
        createPeerConnection(stream);
    }, [setupMedia, createPeerConnection]);

    const sendMessage = useCallback((message: any) => {
        if (dcRef.current?.readyState === "open") {
            try {
                dcRef.current.send(JSON.stringify(message));
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }, []);

    const endCall = useCallback(async () => {
        dcRef.current?.close();
        dcRef.current = null;
        pcRef.current?.close();
        pcRef.current = null;
        localStream?.getTracks().forEach(t => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        setConnectionStatus("disconnected");
        await clearSignalsMutation({ appointmentId });
    }, [localStream, appointmentId, clearSignalsMutation]);

    return {
        localStream,
        remoteStream,
        connectionStatus,
        startCall,
        joinCall,
        endCall,
        sendMessage,
    };
}
