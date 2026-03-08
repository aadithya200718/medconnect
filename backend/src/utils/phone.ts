/**
 * Normalize phone number to E.164 format
 * Defaults to India (+91) if no country code is provided
 */
export function normalizePhone(phone: string): string {
    if (!phone) return phone;

    // Remove all characters except digits and +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // If it starts with +, return as is (assuming valid E.164)
    if (cleaned.startsWith('+')) {
        return cleaned;
    }

    // If 10 digits, assume India (+91)
    if (cleaned.length === 10) {
        return `+91${cleaned}`;
    }

    // If 12 digits and starts with 91, assume India
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned}`;
    }

    // For other lengths, just prepend + and hope for the best (or let Twilio validate)
    return `+${cleaned}`;
}
