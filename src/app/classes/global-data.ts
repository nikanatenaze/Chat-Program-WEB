export class GlobalData {
    // Main urls
    static readonly LOCAL_HOSTED_URL = "https://localhost:7173"
    static readonly LOCAL_HOSTED_API_URL = this.LOCAL_HOSTED_URL + "/api"
    static readonly RENDER_URL = "https://chat-program-api.onrender.com"
    static readonly RENDER_API_URL = this.RENDER_URL + "/api"
    // Passwords
    static readonly PASSWORD_MIN_LENGTH = 6
    static readonly PASSWORD_REGEX = new RegExp(`^[A-Za-z\\d@$!%*#?&]{${GlobalData.PASSWORD_MIN_LENGTH},}$`);
}
