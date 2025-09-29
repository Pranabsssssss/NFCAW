try {
    showMessage("Marking attendance, please wait...");

    const response = await fetch(`/api/rfid?rfidKey=${encodeURIComponent(rfidKey)}`, {
        method: "POST",
    });

    const text = await response.text();

    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch (jsonError) {
        console.error("JSON parse error:", jsonError, "Response text:", text);
    }

    if (response.ok) {
        if (data && data.success) {
            showMessage(`Attendance marked successfully for RFID: ${data.rfidKey} at ${data.timestamp}`);
        } else {
            showMessage("Attendance marked but unexpected response.", true);
            console.error("Unexpected JSON data:", data);
        }
    } else {
        if (data) {
            if (response.status === 409) {
                showMessage(`Attendance already marked today at ${data.previousTimestamp}`, true);
            } else if (response.status === 404) {
                showMessage("RFID key not found in attendance list.", true);
            } else {
                showMessage(`Error marking attendance: ${data.error || "Unknown error"}`, true);
            }
        } else {
            showMessage(`Error: Empty or invalid response from server.`, true);
            console.error("Empty or invalid response:", text);
        }
    }
} catch (error) {
    showMessage(`Network or server error: ${error.message}`, true);
}