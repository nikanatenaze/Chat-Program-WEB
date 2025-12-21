export class UserClass {
    public id: number;
    public name: string;
    public email: string;
    public createdAt: string;

    constructor(id: number, name: string, email: string, createDate: string) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.createdAt = createDate;
    }
}