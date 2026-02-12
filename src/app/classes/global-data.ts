export class GlobalData {
    // Main urls
    static readonly localHostUrl = "https://localhost:7173/"
    static readonly localHostApiUrl = "https://localhost:7173/api"
    static readonly renderUrl = "https://chat-program-api.onrender.com"
    static readonly renderApiUrl = "https://chat-program-api.onrender.com/api"
    // Passwords
    static readonly PASSWORD_MIN_LENGTH = 6
    static readonly PASSWORD_REGEX = new RegExp(`^[A-Za-z\\d@$!%*#?&]{${GlobalData.PASSWORD_MIN_LENGTH},}$`);
}
