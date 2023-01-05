import { execSync } from "child_process";

export default function sleep( ms: number ): void
{   
    setTimeout(() => console.log(`sleeping ${ms} ms`), 1 );
    execSync(`sleep ${ms/1000}`);
}