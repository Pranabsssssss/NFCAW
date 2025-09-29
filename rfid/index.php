<?php
header('Content-Type: application/json');

// Path to the attendance.csv file
$csvFile = __DIR__ . '/attendance.csv';

// Get rfidKey from URL query param
$rfidKey = isset($_GET['rfidKey']) ? trim($_GET['rfidKey']) : '';

if (empty($rfidKey)) {
    echo json_encode(['error' => 'rfidKey query parameter is required']);
    http_response_code(400);
    exit;
}

if (!file_exists($csvFile)) {
    echo json_encode(['error' => 'Attendance CSV file not found']);
    http_response_code(500);
    exit;
}

// Read the CSV into an array
$rows = array_map('str_getcsv', file($csvFile));

// Get headers
$headers = array_map('trim', $rows[0]);

// Find RFID UID col index
$rfidColIndex = array_search('RFID UID', $headers);
if ($rfidColIndex === false) {
    echo json_encode(['error' => 'RFID UID column not found in CSV']);
    http_response_code(500);
    exit;
}

// Get today's day in IST timezone
date_default_timezone_set('Asia/Kolkata');
$todayDay = (string) intval(date('j')); // day of the month without leading zeros

// Find day column index (match today)
$dayColIndex = array_search($todayDay, $headers);
if ($dayColIndex === false) {
    echo json_encode(['error' => 'Today\'s day column not found in CSV']);
    http_response_code(500);
    exit;
}

// Find student row by RFID UID and mark attendance
$found = false;
for ($i = 1; $i < count($rows); $i++) {
    $row = $rows[$i];
    if (isset($row[$rfidColIndex]) && trim($row[$rfidColIndex]) === $rfidKey) {
        $found = true;
        if (!empty(trim($row[$dayColIndex]))) {
            // Attendance already marked today
            echo json_encode([
                'error' => 'Attendance already marked for today',
                'day' => $todayDay,
                'previous' => $row[$dayColIndex]
            ]);
            http_response_code(409);
            exit;
        }
        // Mark attendance: current datetime in IST
        $rows[$i][$dayColIndex] = date('d-m-Y H:i:s');
        break;
    }
}

if (!$found) {
    echo json_encode(['error' => 'RFID UID not found']);
    http_response_code(404);
    exit;
}

// Write updated CSV back to file
$fp = fopen($csvFile, 'w');
foreach ($rows as $fields) {
    fputcsv($fp, $fields);
}
fclose($fp);

// Respond with success
echo json_encode([
    'success' => true,
    'rfidKey' => $rfidKey,
    'markedAt' => date('d-m-Y H:i:s'),
    'day' => $todayDay
]);
exit;
