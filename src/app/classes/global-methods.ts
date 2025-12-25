import { HttpHeaders } from "@angular/common/http";

export class GlobalMethods {
    static GlobalApiUrl = "https://chat-program-api.onrender.com/api"

    static getAuthHeaders() {
        const token = sessionStorage.getItem('token');
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }

    static formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
}
