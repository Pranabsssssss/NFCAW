import fetch from "node-fetch";

const SHEETDB_API_URL = "https://sheetdb.io/api/v1/lilfcdohr7mxa";

function getISTTimestamp() {
    const now = new Date();
    return now.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
    });
}

function getISTDateKey() {
    const now = new Date();
    const istDate = now.toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
    });
    return istDate.toString(); // Ensure your Google Sheet headers for days match this format
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
        // 1. Query SheetDB for the record by RFID UID
        const queryUrl = `${SHEETDB_API_URL}?RFID%20UID=${encodeURIComponent(rfidKey.trim())}`;
        const getResponse = await fetch(queryUrl);
        if (!getResponse.ok) {
            return res.status(500).json({ error: "Failed to query SheetDB" });
        }
        const records = await getResponse.json();

        if (!records.length) {
            return res.status(404).json({ error: "RFID UID not found in attendance sheet" });
        }

        const record = records[0]; // Assuming RFID UID is unique
        const dayKey = getISTDateKey();

        if (record[dayKey] && record[dayKey].trim() !== "") {
            return res.status(409).json({
                error: "Attendance already marked for today",
                previousTimestamp: record[dayKey],
                day: dayKey,
            });
        }

        // 2. Update the attendance for today with current timestamp
        const timestamp = getISTTimestamp();
        const rowId = record._id;

        const updateResponse = await fetch(`${SHEETDB_API_URL}/${rowId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                data: {
                    [dayKey]: timestamp,
                },
            }),
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            return res.status(500).json({ error: "Failed to update attendance", details: errorText });
        }

        return res.status(201).json({
            success: true,
            message: "Attendance marked successfully",
            rfidKey: rfidKey.trim(),
            timestamp,
            day: dayKey,
        });
    } catch (error) {
        return res.status(500).json({ error: "Server error", details: error.message });
    }
}