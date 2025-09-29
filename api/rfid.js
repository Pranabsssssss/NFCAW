const SHEETDB_API_URL = "https://sheetdb.io/api/v1/lilfcdohr7mxa";

function getISTTimestamp() {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
}

function getISTDateKey() {
    return new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric" }).toString();
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
        // Query SheetDB for the student record
        const queryUrl = `${SHEETDB_API_URL}?RFID%20UID=${encodeURIComponent(rfidKey.trim())}`;
        const queryResponse = await fetch(queryUrl);
        if (!queryResponse.ok) {
            return res.status(500).json({ error: "Failed to query SheetDB" });
        }
        const records = await queryResponse.json();

        if (!records.length) {
            return res.status(404).json({ error: "RFID UID not found in SheetDB" });
        }

        const record = records[0]; // Unique RFID assumed
        const dayKey = getISTDateKey();

        if (record[dayKey] && record[dayKey].trim() !== "") {
            return res.status(409).json({
                error: "Attendance already marked",
                previousTimestamp: record[dayKey],
                day: dayKey,
            });
        }

        // Update record with attendance timestamp
        const timestamp = getISTTimestamp();
        const rowId = record._id;

        const updateResponse = await fetch(`${SHEETDB_API_URL}/${rowId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: {
                    [dayKey]: timestamp } }),
        });
        if (!updateResponse.ok) {
            const text = await updateResponse.text();
            return res.status(500).json({ error: "Failed to update attendance", details: text });
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