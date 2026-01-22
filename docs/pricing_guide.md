# Pricing Configuration Guide

The pricing for event bookings happens in the application code. This allows for flexibility without needing a database for simple pricing structures.

## How to Change Prices

1.  Open the file: `client/src/pages/EventDetailsPage.tsx`
2.  Look for the `PRICING_CONFIG` section at the top of the file (around line 21).

```typescript
// --- CONFIGURATION ---
// Edit these values to change the pricing for each member type
const PRICING_CONFIG: Record<string, number> = {
    'New Member': 850000,
    'Alumni': 750000
};
```

3.  Modify the numbers valid for **New Member** and **Alumni**.
    *   Do **not** use commas or dots (e.g., use `750000`, not `750.000`).
    *   The system will automatically format it as currency (e.g., `Rp 750.000`) for the user.

## Adding New Member Types

If you want to add a new type (e.g., "Student"):

1.  Add it to `PRICING_CONFIG`:
    ```typescript
    const PRICING_CONFIG: Record<string, number> = {
        'New Member': 850000,
        'Alumni': 750000,
        'Student': 500000  // <--- New Entry
    };
    ```

2.  Update the **Dropdown Menu** in the form (search for `<select>` inside the same file):
    ```tsx
    <select ...>
       <option>New Member</option>
       <option>Alumni</option>
       <option>Student</option> {/* <--- New Option */}
    </select>
    ```

## Logic Overview

*   **Calculation**: The app calculates the price instantly when the user selects a member type.
*   **Booking**: This calculated price (`formattedPrice`) is sent to the backend when "Book Now" is clicked.
*   **Ticket**: The backend saves this price to the Google Sheet and prints it on the PDF Ticket.
