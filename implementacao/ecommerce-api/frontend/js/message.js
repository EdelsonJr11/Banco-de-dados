export function createMessageService(messageElement) {
    const set = (text) => {
        messageElement.textContent = text || "";
    };

    return {
        set,
        clear: () => set(""),
        error: (error) => set(error?.message || "Erro inesperado")
    };
}
