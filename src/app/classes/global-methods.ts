import { HttpHeaders } from "@angular/common/http";
import { User } from "../services/user";
import { Auth } from "../services/auth";
import Swal from "sweetalert2";

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

    static formatDate(dateString: string, withTime: boolean = false, onlyTime: boolean = false) {
        let cleanDate = dateString.split('.')[0];
        
        const isoString = cleanDate.replace(' ', 'T') + 'Z';
        const date = new Date(isoString);

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        if (withTime) {
            return `${year}/${month}/${day} ${this.to12Hour(date.getHours(), date.getMinutes())}`;
        }
        if (onlyTime) {
            return `${this.to12Hour(date.getHours(), date.getMinutes())}`;
        }
        return `${year}/${month}/${day}`;
    }

    static to12Hour(hours: number, minutes: number) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const h = hours % 12 || 12;
        return `${h}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    static notImplemented() {
        Swal.fire({
            icon: 'info',
            title: 'Not Implemented',
            text: 'This feature is not implemented yet.',
            confirmButtonText: 'OK'
        });
    }
}
