import { HttpHeaders } from "@angular/common/http";

export class GlobalMethods {
    static GlobalApiUrl = "https://chat-program-api.onrender.com/api"

    static getAuthHeaders() {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }
}
