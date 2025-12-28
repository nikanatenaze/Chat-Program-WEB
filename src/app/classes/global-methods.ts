import { HttpHeaders } from "@angular/common/http";
import { User } from "../services/user";
import { Auth } from "../services/auth";

export class GlobalMethods {

    constructor(public userService: User, public auth: Auth) { }

    static GlobalApiUrl = "https://chat-program-api.onrender.com/api"

    static getAuthHeaders() {
        const token = sessionStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }

    static getToken() {
        return sessionStorage.getItem('token');
    }

    static formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
}
