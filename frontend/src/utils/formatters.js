/**
 * Format a date string to IST display format
 */
export function formatIST(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    } catch {
        return dateStr;
    }
}

/**
 * Format date only (no time)
 */
export function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit', month: 'short', year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Calculate age from DOB
 */
export function calculateAge(dob) {
    if (!dob) return { years: 0, months: 0, display: 'N/A' };
    const birth = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
        years--;
        months += 12;
    }
    if (today.getDate() < birth.getDate()) months--;
    if (months < 0) months = 0;
    return {
        years,
        months,
        display: years > 0 ? `${years}y ${months}m` : `${months}m`
    };
}

/**
 * Format phone for display
 */
export function formatPhone(phone) {
    if (!phone) return '';
    const p = phone.replace(/\D/g, '');
    if (p.length === 10) return `${p.slice(0, 5)} ${p.slice(5)}`;
    return phone;
}

/**
 * Status badge color mapping
 */
export const statusColors = {
    WAITING: 'badge-yellow',
    IN_PROGRESS: 'badge-blue',
    COMPLETED: 'badge-green',
    SKIPPED: 'badge-gray',
    OPEN: 'badge-blue',
    DRAFT: 'badge-gray',
    APPROVED: 'badge-green',
    DISPENSED: 'badge-purple',
    ADMITTED: 'badge-red',
    DISCHARGED: 'badge-green',
    AVAILABLE: 'badge-green',
    OCCUPIED: 'badge-red',
    HOUSEKEEPING: 'badge-yellow',
    RESERVED: 'badge-blue',
};
