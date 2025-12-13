export class Secretary {
    name: string;
    email: string;
    password: string;

    constructor(props: {
        name: string;
        email: string;
        password: string;
    }) {
        this.name = props.name;
        this.email = props.email;
        this.password = props.password;
    }
}