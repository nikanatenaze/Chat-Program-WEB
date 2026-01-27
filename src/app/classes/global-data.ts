export class GlobalData {
    // Passwords
    static readonly PASSWORD_MIN_LENGTH = 6
    static readonly PASSWORD_REGEX = new RegExp(`^[A-Za-z\\d@$!%*#?&]{${GlobalData.PASSWORD_MIN_LENGTH},}$`);
}
