# KKM Data Management Guide

This guide explains how to manage the content of the KKM App using the Google Sheet acting as the database.

## 1. Events Sheet (`Events list`)

The app pulls event data from the tab named **"Events list"**.
**Important**: The application converts column names to lowercase and replaces spaces with underscores (e.g., "Event Name" -> `event_name`).

### Image Management (`event_images`)
The system is designed to work seamlessly with **Google Drive**.

**How to add an image:**
1.  **Upload** your image to a Google Drive folder.
2.  **Right-click** the image -> **Share** -> **Share**.
3.  Under "General Access", change "Restricted" to **"Anyone with the link"**.
4.  **Copy Link** (e.g., `https://drive.google.com/file/d/123abc.../view?usp=sharing`).
5.  **Paste** this link directly into the `event_images` column for the corresponding row.

**How it works:**
The app automatically detects Google Drive links and converts them into a direct-embed format so they display instantly in the app without the user needing to log in to Drive.

### Location & Maps (`location`)
The text entered in the `location` column (e.g., "Sejati Camp and Resort") is used for:
1.  **Display**: Shown on the Event Card and Details page.
2.  **Directions**: The app uses this text to generate a Google Maps link. Ensure the location name is accurate and searchable on Google Maps for the best user experience.

### Other Columns
*   **activity**: The title of the event.
*   **start_time**: Date string (e.g., "8/23/2025").
*   **event_capacity**: Total seats available.
*   **current_capacity**: Seats already taken.
*   **status**: e.g., "Open", "Closed".
*   **description**: Full text description of the event.

## 2. Marketplace Sheet (`Market Place`)
The app pulls data from the **"Market Place"** tab.

### Required Header Columns:
*   **Product Name**: Title of the item.
*   **Unit Price**: Price string (e.g., "Rp 50.000").
*   **Category**: e.g., "Tents", "Lighting", "Cooking".
*   **Image**: (Optional) Google Drive link to the product image. Follows the **same 5-step process** as Event Images above.
