function isValidMessage(msg) {
    return msg.value && typeof msg.value === "object" && msg.value.type 
        && msg.value.content && typeof msg.value.content === "object"
}

module.exports = { isValidMessage: isValidMessage }
