export function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString("pt-BR");
}

export function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR");
}

export function toInputDate(value) {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
}

export function toNumberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
}

export function formatMoney(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0.00";
    return number.toFixed(2);
}
