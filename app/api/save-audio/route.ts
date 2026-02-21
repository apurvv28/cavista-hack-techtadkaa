import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("audio") as File;
        const patientName = formData.get("patientName") as string;

        if (!file || !patientName) {
            return NextResponse.json({ error: "Missing file or patient name" }, { status: 400 });
        }

        const sanitizedName = patientName.replace(/[^a-zA-Z0-9]/g, "");
        const transcriptsDir = path.join(process.cwd(), "raw_transcripts");

        if (!fs.existsSync(transcriptsDir)) {
            fs.mkdirSync(transcriptsDir, { recursive: true });
        }

        const files = fs.readdirSync(transcriptsDir);
        const patientFiles = files.filter(f => f.startsWith(sanitizedName) && f.endsWith(".webm"));

        let srno = 1;
        if (patientFiles.length > 0) {
            const numbers = patientFiles.map(f => {
                const match = f.match(new RegExp(`${sanitizedName}(\\d+)\\.webm`));
                return match ? parseInt(match[1]) : 0;
            });
            srno = Math.max(...numbers) + 1;
        }

        const fileName = `${sanitizedName}${srno}.webm`;
        const filePath = path.join(transcriptsDir, fileName);

        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(filePath, buffer);

        return NextResponse.json({ success: true, fileName });
    } catch (error) {
        console.error("Error saving audio locally:", error);
        return NextResponse.json({ error: "Failed to save audio" }, { status: 500 });
    }
}
