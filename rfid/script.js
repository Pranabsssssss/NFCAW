window.addEventListener("DOMContentLoaded", async() => {
    const messageDiv = document.createElement("div");
    messageDiv.style.fontFamily = "Arial, sans-serif";
    messageDiv.style.padding = "20px";
    messageDiv.style.textAlign = "center";
    messageDiv.style.marginTop = "30px";
    document.body.appendChild(messageDiv);

    function showMessage(text, isError = false) {
        messageDiv.textContent = text;
        messageDiv.style.color = isError ? "red" : "green";
    }

    const params = new URLSearchParams(window.location.search);
    const rfidKey = params.get("rfidKey");

    if (!rfidKey) {
        showMessage("Error: RFID key not provided in URL.", true);
        return;
    }

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
                console.error("Unexpected response data:", data);
            }
        } else {
            if (data) {
                if (response.status === 409) {
                    showMessage(`Attendance already marked today at ${data.previousTimestamp}`, true);
                } else if (response.status === 404) {
                    showMessage("RFID key not found in attendance list.", true);
                } else {
                    showMessage(`Error: ${data.error || "Unknown error"}`, true);
                }
            } else {
                showMessage("Error: Empty or invalid response from server.", true);
                console.error("Empty server response:", text);
            }
        }
    } catch (error) {
        showMessage(`Network or server error: ${error.message}`, true);
    }
});