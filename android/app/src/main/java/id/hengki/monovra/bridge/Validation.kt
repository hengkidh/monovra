package id.hengki.monovra.bridge

/** Input validation for everything that crosses the JS → Kotlin boundary. */
object Validation {
    const val MAX_MESSAGE_CHARS = 16 * 1024
    const val MAX_FAVORITES = 32

    private val packagePattern = Regex("^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z0-9_]+)+$")
    private val methodPattern = Regex("^[a-zA-Z]{1,40}$")

    fun isPackageName(value: String?): Boolean =
        value != null && value.length in 3..255 && packagePattern.matches(value)

    fun isMethodName(value: String?): Boolean = value != null && methodPattern.matches(value)
}

/** Error codes returned to JavaScript in `{ ok: false, error: { code, message } }`. */
object BridgeError {
    const val BAD_REQUEST = "BAD_REQUEST"
    const val UNKNOWN_METHOD = "UNKNOWN_METHOD"
    const val INVALID_ARGUMENT = "INVALID_ARGUMENT"
    const val NOT_INSTALLED = "NOT_INSTALLED"
    const val LAUNCH_FAILED = "LAUNCH_FAILED"
    const val NO_SESSION = "NO_SESSION"
    const val UNSUPPORTED = "UNSUPPORTED"
    const val PERMISSION_DENIED = "PERMISSION_DENIED"
    const val INTERNAL = "INTERNAL"
}

class BridgeException(val code: String, message: String) : Exception(message)
