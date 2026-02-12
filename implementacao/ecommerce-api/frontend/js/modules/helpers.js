export async function runWithUiError(message, callback) {
    message.clear();
    try {
        await callback();
    } catch (error) {
        message.error(error);
    }
}
