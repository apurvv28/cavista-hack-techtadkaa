import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const { patientName, content } = await req.json();

        if (!patientName || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Sanitize patient name: remove spaces and special characters
        const sanitizedName = patientName.replace(/[^a-zA-Z0-9]/g, "");
        const transcriptsDir = path.join(process.cwd(), "raw_transcripts");

        // Ensure directory exists (should be created by now, but safety first)
        if (!fs.existsSync(transcriptsDir)) {
            fs.mkdirSync(transcriptsDir, { recursive: true });
        }

        // Find the next serial number
        const files = fs.readdirSync(transcriptsDir);
        const patientFiles = files.filter(f => f.startsWith(sanitizedName) && f.endsWith(".txt"));

        let srno = 1;
        if (patientFiles.length > 0) {
            // Extract numbers from filenames like PatientName1.txt, PatientName2.txt
            const numbers = patientFiles.map(f => {
                const match = f.match(new RegExp(`${sanitizedName}(\\d+)\\.txt`));
                return match ? parseInt(match[1]) : 0;
            });
            srno = Math.max(...numbers) + 1;
        }

        const fileName = `${sanitizedName}${srno}.txt`;
        const filePath = path.join(transcriptsDir, fileName);

        fs.writeFileSync(filePath, content, "utf8");

        return NextResponse.json({
            success: true,
            fileName,
            path: filePath
        });
    } catch (error) {
        console.error("Error saving transcript locally:", error);
        return NextResponse.json({ error: "Failed to save transcript locally" }, { status: 500 });
    }
}
