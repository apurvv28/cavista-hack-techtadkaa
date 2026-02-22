import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_BACKEND_CHAT_PATH = "/chat";

function normalizeBaseUrl(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const message = typeof body?.message === "string" ? body.message.trim() : "";

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const backendBaseUrl = normalizeBaseUrl(
            process.env.PYTHON_BACKEND_URL ||
            process.env.NEXT_PUBLIC_BACKEND_URL ||
            DEFAULT_BACKEND_BASE_URL,
        );

        const backendChatPath =
            process.env.PYTHON_BACKEND_CHAT_PATH || DEFAULT_BACKEND_CHAT_PATH;
        const backendUrl = `${backendBaseUrl}${backendChatPath}`;

        const backendResponse = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
        });

        if (!backendResponse.ok) {
            const errorText = await backendResponse.text();
            return NextResponse.json(
                {
                    error: "Backend chat service returned an error",
                    details: errorText || backendResponse.statusText,
                },
                { status: backendResponse.status },
            );
        }

        const data = await backendResponse.json();
        const reply = data?.reply || data?.response || data?.message;

        if (typeof reply !== "string" || !reply.trim()) {
            return NextResponse.json(
                {
                    error:
                        "Backend response did not include a valid reply field (reply/response/message)",
                },
                { status: 502 },
            );
        }

        return NextResponse.json({ reply });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: "Failed to process chat request",
                details: error?.message || "Unknown error",
            },
            { status: 500 },
        );
    }
}
