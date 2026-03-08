// auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
    HttpInterceptor, HttpRequest, HttpHandler,
    HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { Auth } from '../services/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private isRefreshing = false;
    private refreshDone$ = new BehaviorSubject<string | null>(null);

    constructor(private auth: Auth) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const token = this.auth.getToken();
        const isRefreshRequest = req.url.includes('/Auth/refresh'); // 👈 add this

        // 👇 Don't attach token to refresh requests
        const authReq = (token && !isRefreshRequest) ? this.addToken(req, token) : req;

        return next.handle(authReq).pipe(
            catchError((err: HttpErrorResponse) => {
                if (err.status === 401 && !isRefreshRequest) { // 👈 use same variable
                    return this.handle401(req, next);
                }
                return throwError(() => err);
            })
        );
    }

    private addToken(req: HttpRequest<any>, token: string) {
        return req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });
    }

    private handle401(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (this.isRefreshing) {
            // Queue other requests until refresh completes
            return this.refreshDone$.pipe(
                filter(token => token !== null),
                take(1),
                switchMap(token => next.handle(this.addToken(req, token!)))
            );
        }

        this.isRefreshing = true;
        this.refreshDone$.next(null);

        return this.auth.refreshToken().pipe(
            switchMap((res) => {
                this.isRefreshing = false;
                this.refreshDone$.next(res.accessToken);
                return next.handle(this.addToken(req, res.accessToken)); // Retry original request
            }),
            catchError((err) => {
                this.isRefreshing = false;
                return throwError(() => err);
            })
        );
    }
}