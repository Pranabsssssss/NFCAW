import { promises as fs } from "fs";
import path from "path";

const attendancePath = path.resolve("./attendance.csv");

function getISTTimestamp() {
    const now = new Date();
    const istTime = now.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
    return istTime.replace(/\//g, "-").replace(",", "");
}

function getISTDate() {
    const now = new Date();
    const istDate = now.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
    });
    return parseInt(istDate, 10);
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method Not Allowed, use POST" });
    }

    const rfidKey = req.query.rfidKey;
    if (!rfidKey || typeof rfidKey !== "string" || rfidKey.trim() === "") {
        return res.status(400).json({ error: "rfidKey query parameter is required" });
    }

    try {
        let csvText = await fs.readFile(attendancePath, "utf8");
        const lines = csvText.split("\n").filter(Boolean);
        if (!lines.length) {
            return res.status(500).json({ error: "Attendance CSV is empty" });
        }

        // Parse header and find columns
        const header = lines[0].split(",").map((col) => col.trim());
        const rfidColIdx = header.indexOf("RFID UID");
        const currentDay = getISTDate();

        if (rfidColIdx === -1) {
            return res.status(500).json({ error: "RFID UID column missing in CSV" });
        }

        // Find day column index
        let dayColIdx = -1;
        for (let i = 0; i < header.length; i++) {
            if (header[i] === currentDay.toString()) {
                dayColIdx = i;
                break;
            }
        }
        if (dayColIdx === -1) {
            return res.status(500).json({ error: `Day column '${currentDay}' not found in CSV` });
        }

        // Find row for the RFID key
        let found = false;
        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(",").map((col) => col.trim());
            if (row[rfidColIdx] === rfidKey.trim()) {
                found = true;
                if (row[dayColIdx] && row[dayColIdx] !== "") {
                    return res.status(409).json({ error: "Attendance already marked for today", previousTimestamp: row[dayColIdx], day: currentDay });
                }
                // Mark attendance with timestamp
                row[dayColIdx] = getISTTimestamp();
                lines[i] = row.join(",");
                // Save updated CSV
                await fs.writeFile(attendancePath, lines.join("\n") + "\n", "utf8");
                return res.status(201).json({ success: true, message: "Attendance marked successfully", rfidKey: rfidKey.trim(), timestamp: row[dayColIdx], day: currentDay });
            }
        }
        if (!found) {
            return res.status(404).json({ error: "RFID UID not found in attendance list" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Server error", details: error.message });
    }
}